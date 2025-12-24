import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';

interface ExtractTopicsRequest {
  gameId: string;
  slideId?: string; // Optional: for presentation slides - filter by slide and skip state updates
}

interface ExtractTopicsResponse {
  success: boolean;
  topicCount: number;
  submissionCount: number;
}

interface TopicEntry {
  topic: string;
  description: string;
  count: number;
  variations: string[];
  submissionIds: string[];
}

interface InterestSubmission {
  id: string;
  playerId: string;
  playerName: string;
  rawText: string;
}

// System prompt for grouping similar submissions
const EXTRACTION_PROMPT = `You are analyzing free-form text submissions from participants. Your task is to GROUP SEMANTICALLY SIMILAR submissions together and provide a summary for each group.

IMPORTANT: Focus on the MEANING and INTENT of submissions, not just keywords. Group submissions that:
- Ask about the same thing (even if worded differently)
- Express similar ideas or concepts
- Share common concerns or themes
- Would naturally belong together in a discussion

Auto-detect the type of content (questions, ideas, feedback, concerns, suggestions, etc.) and adapt your grouping accordingly.

Respond ONLY with valid JSON in this exact format:
{
  "topics": [
    {
      "topic": "State Management Best Practices",
      "description": "Several participants are asking about the best approaches to handle application state, including when to use different state management solutions and how to avoid common pitfalls.",
      "count": 5,
      "variations": ["How do you handle state?", "Best way to manage app state", "Redux vs Context - which is better?"],
      "submissionIds": ["id1", "id2", "id3", "id4", "id5"]
    },
    {
      "topic": "Team Communication Improvements",
      "description": "Multiple submissions suggest ways to improve how the team communicates, with focus on async communication and reducing unnecessary meetings.",
      "count": 3,
      "variations": ["We need fewer meetings", "More Slack, less Zoom", "Async updates would help"],
      "submissionIds": ["id6", "id7", "id8"]
    }
  ]
}

Guidelines:
- **topic**: A short, descriptive title (3-8 words, Title Case) summarizing the group
- **description**: A 1-2 sentence summary explaining what the grouped submissions have in common and their key themes
- **count**: Number of submissions in this group
- **variations**: 2-5 representative excerpts or paraphrases from the submissions (not keywords)
- **submissionIds**: IDs of all submissions in this group

Grouping rules:
- Each submission should belong to exactly ONE group (no overlap)
- Create 3-15 groups depending on content diversity
- Similar submissions MUST be grouped together even if only 2-3 items
- Unique submissions that don't fit elsewhere should form their own small groups
- Order groups by count (highest first)
- If a submission is truly unique, it can be a group of 1`;

/**
 * Parse the AI topic extraction response
 */
function parseExtractionResponse(responseText: string): TopicEntry[] {
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error('Invalid topics structure');
    }

    return parsed.topics.map((t: TopicEntry) => ({
      topic: t.topic,
      description: t.description || '',
      count: t.count || 1,
      variations: t.variations || [t.topic],
      submissionIds: t.submissionIds || [],
    }));
  } catch (error) {
    console.error('Failed to parse extraction response:', responseText);
    throw new HttpsError('internal', 'Failed to parse AI topic extraction response');
  }
}

/**
 * Cloud Function to extract topics from Interest Cloud submissions using Gemini
 */
export const extractTopics = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 180,
    memory: '512MiB',
    maxInstances: 5,
    concurrency: 5,
    serviceAccount: AI_SERVICE_ACCOUNT,
    enforceAppCheck: false,
  },
  async (request): Promise<ExtractTopicsResponse> => {
    verifyAppCheck(request);

    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to extract topics');
    }

    const data = request.data as ExtractTopicsRequest;

    // Validate input
    if (!data.gameId || typeof data.gameId !== 'string') {
      throw new HttpsError('invalid-argument', 'Game ID is required');
    }

    const db = admin.firestore();

    // Verify the user is the host of this game
    const gameDoc = await db.collection('games').doc(data.gameId).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data();
    if (gameData?.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the game host can process submissions');
    }

    // Verify this is a Thoughts Gathering game OR a presentation (when slideId is provided)
    const isPresentation = !!data.slideId;
    if (!isPresentation && gameData?.activityType !== 'thoughts-gathering') {
      throw new HttpsError('failed-precondition', 'This game is not a Thoughts Gathering activity');
    }

    // Get submissions for this game (optionally filtered by slideId for presentations)
    let submissionsQuery: admin.firestore.Query = db
      .collection('games')
      .doc(data.gameId)
      .collection('submissions');

    if (data.slideId) {
      submissionsQuery = submissionsQuery.where('slideId', '==', data.slideId);
    }

    const submissionsSnapshot = await submissionsQuery.get();

    // Determine topics document ID based on whether this is for a specific slide
    const topicsDocId = data.slideId ? `topics-${data.slideId}` : 'topics';

    if (submissionsSnapshot.empty) {
      // No submissions - update game state (only for standalone, not presentations)
      if (!isPresentation) {
        await db.collection('games').doc(data.gameId).update({
          state: 'display',
        });
      }

      // Write empty topics aggregate
      await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set({
        topics: [],
        totalSubmissions: 0,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(data.slideId && { slideId: data.slideId }),
      });

      return {
        success: true,
        topicCount: 0,
        submissionCount: 0,
      };
    }

    // Prepare submissions for topic extraction
    const submissions: InterestSubmission[] = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<InterestSubmission, 'id'>,
    }));

    // Build the extraction request
    const submissionsForAI = submissions.map(s => ({
      submissionId: s.id,
      playerName: s.playerName,
      text: s.rawText,
    }));

    try {
      // Initialize Gemini client
      const client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
      });

      // Build the prompt
      const userPrompt = `Group these ${submissions.length} submissions by semantic similarity. Each submission should belong to exactly one group.

${JSON.stringify(submissionsForAI, null, 2)}

Create meaningful groups based on shared themes, questions, or ideas. Provide a short title and summary description for each group.`;

      // Call Gemini
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: EXTRACTION_PROMPT,
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 65536,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new HttpsError('internal', 'No response received from AI model');
      }

      // Parse topic extraction results
      const topics = parseExtractionResponse(responseText);

      // Write topics to aggregates collection
      await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set({
        topics,
        totalSubmissions: submissions.length,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(data.slideId && { slideId: data.slideId }),
      });

      // Update game state to display (only for standalone, not presentations)
      if (!isPresentation) {
        await db.collection('games').doc(data.gameId).update({
          state: 'display',
        });
      }

      const logContext = data.slideId ? `slide ${data.slideId} in` : '';
      console.log(`Extracted ${topics.length} topics from ${submissions.length} submissions for ${logContext}game ${data.gameId}`);

      return {
        success: true,
        topicCount: topics.length,
        submissionCount: submissions.length,
      };
    } catch (error) {
      console.error('Error extracting topics:', error);

      // Revert game state on error (only for standalone, not presentations)
      if (!isPresentation) {
        await db.collection('games').doc(data.gameId).update({
          state: 'collecting',
        });
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new HttpsError('resource-exhausted', 'AI quota exceeded. Please try again later.');
        }
        if (error.message.includes('safety')) {
          throw new HttpsError('invalid-argument', 'Some submissions were flagged by content safety filters.');
        }
      }

      throw new HttpsError('internal', 'Failed to extract topics. Please try again.');
    }
  }
);
