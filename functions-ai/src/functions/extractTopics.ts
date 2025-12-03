import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';

interface ExtractTopicsRequest {
  gameId: string;
}

interface ExtractTopicsResponse {
  success: boolean;
  topicCount: number;
  submissionCount: number;
}

interface TopicEntry {
  topic: string;
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

// System prompt for extracting topics from interest submissions
const EXTRACTION_PROMPT = `You are analyzing free-form text submissions from participants sharing their interests.

Your task is to:
1. Extract distinct topics/interests from the submissions
2. Normalize similar phrases into canonical topic names (e.g., "ML", "machine learning", "AI/ML" -> "Machine Learning")
3. Count how many submissions mention each topic
4. Track which submissions contain each topic

Respond ONLY with valid JSON in this exact format:
{
  "topics": [
    {
      "topic": "Machine Learning",
      "count": 5,
      "variations": ["ML", "machine learning", "AI/ML", "deep learning"],
      "submissionIds": ["id1", "id2", "id3", "id4", "id5"]
    },
    {
      "topic": "Web Development",
      "count": 3,
      "variations": ["web dev", "frontend", "React"],
      "submissionIds": ["id2", "id6", "id7"]
    }
  ]
}

Guidelines:
- Create meaningful, descriptive topic names (Title Case)
- Merge very similar topics (don't create both "JavaScript" and "JS")
- Keep the topic list focused - aim for 5-20 distinct topics
- A single submission can contribute to multiple topics
- Order topics by count (highest first)
- Ignore very generic terms like "technology", "stuff", "things"
- Be inclusive - even if only one person mentions a topic, include it`;

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
    timeoutSeconds: 120,
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

    // Verify this is an Interest Cloud game
    if (gameData?.activityType !== 'interest-cloud') {
      throw new HttpsError('failed-precondition', 'This game is not an Interest Cloud activity');
    }

    // Get all submissions for this game
    const submissionsSnapshot = await db
      .collection('games')
      .doc(data.gameId)
      .collection('submissions')
      .get();

    if (submissionsSnapshot.empty) {
      // No submissions - update game state and return
      await db.collection('games').doc(data.gameId).update({
        state: 'display',
      });

      // Write empty topics aggregate
      await db.collection('games').doc(data.gameId).collection('aggregates').doc('topics').set({
        topics: [],
        totalSubmissions: 0,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      const userPrompt = `Extract and organize topics from these ${submissions.length} interest submissions:

${JSON.stringify(submissionsForAI, null, 2)}

Identify the main topics/interests mentioned, normalize similar phrases, and count occurrences.`;

      // Call Gemini
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: EXTRACTION_PROMPT,
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 4096,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new HttpsError('internal', 'No response received from AI model');
      }

      // Parse topic extraction results
      const topics = parseExtractionResponse(responseText);

      // Write topics to aggregates collection
      await db.collection('games').doc(data.gameId).collection('aggregates').doc('topics').set({
        topics,
        totalSubmissions: submissions.length,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update game state to display
      await db.collection('games').doc(data.gameId).update({
        state: 'display',
      });

      console.log(`Extracted ${topics.length} topics from ${submissions.length} submissions for game ${data.gameId}`);

      return {
        success: true,
        topicCount: topics.length,
        submissionCount: submissions.length,
      };
    } catch (error) {
      console.error('Error extracting topics:', error);

      // Revert game state on error
      await db.collection('games').doc(data.gameId).update({
        state: 'collecting',
      });

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
