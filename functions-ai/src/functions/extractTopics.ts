import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import { findSimilarAgents, getTopMatureAgents, MatchingAgent } from '../utils/vectorSearch';

interface ExtractTopicsRequest {
  gameId: string;
  slideId?: string; // Optional: for presentation slides - filter by slide and skip state updates
  elementId?: string; // Optional: for presentation elements - read from responses collection filtered by elementId
  customInstructions?: string; // Optional: host-provided instructions for refining analysis
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

interface TopicAgentMatch {
  topicName: string;
  matchingAgents: MatchingAgent[];
}

interface ThoughtsGatheringConfig {
  prompt: string;
  maxSubmissionsPerPlayer: number;
  allowMultipleRounds: boolean;
  agenticUseCasesCollection?: boolean;
}

// System prompt for grouping similar submissions
const EXTRACTION_PROMPT = `You are analyzing free-form text submissions from participants who were asked to respond to a specific prompt. Your task is to GROUP submissions into DISTINCT CATEGORIES based on their specific content.

CRITICAL: Avoid creating groups that simply restate the original collection prompt. Instead, identify the SPECIFIC sub-categories, instances, or variations within the responses.

For example:
- If the prompt was "What AI use cases interest you?"
- DON'T create: "AI Use Cases" (too generic, just restates prompt)
- DO create: "Customer Service Automation", "Document Processing", "Predictive Analytics" (specific sub-categories)

GROUPING STRATEGY:
1. First, understand what the collection prompt was asking for
2. Identify the DISTINCT types/categories/instances in the submissions
3. Group by SPECIFIC subject matter, not the generic theme
4. Use descriptive names that differentiate each group

Respond ONLY with valid JSON in this exact format:
{
  "summary": "A 2-3 paragraph executive summary of the session findings. Highlight the most popular themes, notable consensus areas, interesting outliers, and any gaps. Write in a professional tone suitable for sharing with stakeholders.",
  "topics": [
    {
      "topic": "Customer Service Chatbots",
      "description": "Submissions focused on using AI for automated customer support, virtual assistants, and chat-based interactions with customers.",
      "count": 5,
      "variations": ["AI chatbot for support tickets", "Virtual assistant for FAQ", "Automated customer responses"],
      "submissionIds": ["id1", "id2", "id3", "id4", "id5"]
    },
    {
      "topic": "Document Processing Automation",
      "description": "Ideas around using AI to extract, classify, and process documents like invoices, contracts, and forms.",
      "count": 3,
      "variations": ["Invoice data extraction", "Contract analysis", "Form digitization"],
      "submissionIds": ["id6", "id7", "id8"]
    }
  ]
}

Guidelines:
- **topic**: A specific, descriptive title (6-10 words, Title Case) that DIFFERENTIATES this group from others and answers the initial prompt to the participants
- **description**: 2-3 sentences explaining the specific focus of this group
- **count**: Number of submissions in this group
- **variations**: 2-5 representative excerpts showing the range of ideas in this group
- **submissionIds**: IDs of all submissions in this group

Grouping rules:
- Each submission can belong to multiple groups
- Create 3-15 groups depending on content diversity
- Groups should represent DISTINCT categories, not overlapping themes
- Unique submissions can form their own small groups
- Order groups by count (highest first)
- NEVER create a group that just restates the collection prompt`;

interface ParsedExtractionResult {
  topics: TopicEntry[];
  summary?: string;
}

/**
 * Parse the AI topic extraction response
 */
function parseExtractionResponse(responseText: string): ParsedExtractionResult {
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

    const topics = parsed.topics.map((t: TopicEntry) => ({
      topic: t.topic,
      description: t.description || '',
      count: t.count || 1,
      variations: t.variations || [t.topic],
      submissionIds: t.submissionIds || [],
    }));

    return {
      topics,
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
    };
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

    // Verify this is a Thoughts Gathering game OR a presentation (when slideId/elementId is provided)
    const isPresentation = !!data.slideId || !!data.elementId;
    if (!isPresentation && gameData?.activityType !== 'thoughts-gathering') {
      throw new HttpsError('failed-precondition', 'This game is not a Thoughts Gathering activity');
    }

    // Fetch activity config to check for agentic use cases feature
    let activityConfig: ThoughtsGatheringConfig | null = null;
    if (gameData?.activityId) {
      const activityDoc = await db.collection('activities').doc(gameData.activityId).get();
      if (activityDoc.exists) {
        activityConfig = activityDoc.data()?.config as ThoughtsGatheringConfig;
      }
    }

    // Determine topics document ID
    const topicsDocId = data.elementId
      ? `topics-${data.elementId}`
      : data.slideId
        ? `topics-${data.slideId}`
        : 'topics';

    let submissions: InterestSubmission[];

    if (data.elementId) {
      // For presentation elements: read from responses collection filtered by elementId
      const responsesQuery = db
        .collection('games')
        .doc(data.gameId)
        .collection('responses')
        .where('elementId', '==', data.elementId);

      const responsesSnapshot = await responsesQuery.get();

      if (responsesSnapshot.empty) {
        await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set({
          topics: [],
          totalSubmissions: 0,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          elementId: data.elementId,
        });
        return { success: true, topicCount: 0, submissionCount: 0 };
      }

      // Convert responses' textAnswers[] into individual submission-like objects
      submissions = [];
      for (const docSnap of responsesSnapshot.docs) {
        const respData = docSnap.data();
        const textAnswers: string[] = respData.textAnswers || [];
        textAnswers.forEach((text: string, idx: number) => {
          submissions.push({
            id: `${docSnap.id}-${idx}`,
            playerId: respData.playerId,
            playerName: respData.playerName,
            rawText: text,
          });
        });
      }

      if (submissions.length === 0) {
        await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set({
          topics: [],
          totalSubmissions: 0,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          elementId: data.elementId,
        });
        return { success: true, topicCount: 0, submissionCount: 0 };
      }
    } else {
      // Original path: read from submissions collection
      let submissionsQuery: admin.firestore.Query = db
        .collection('games')
        .doc(data.gameId)
        .collection('submissions');

      if (data.slideId) {
        submissionsQuery = submissionsQuery.where('slideId', '==', data.slideId);
      }

      const submissionsSnapshot = await submissionsQuery.get();

      if (submissionsSnapshot.empty) {
        if (!isPresentation) {
          await db.collection('games').doc(data.gameId).update({ state: 'display' });
        }
        await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set({
          topics: [],
          totalSubmissions: 0,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(data.slideId && { slideId: data.slideId }),
        });
        return { success: true, topicCount: 0, submissionCount: 0 };
      }

      submissions = submissionsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<InterestSubmission, 'id'>,
        }))
        .filter(sub => !(sub as Record<string, unknown>).hidden);
    }

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

      // Build the prompt with activity context
      const collectionPrompt = activityConfig?.prompt || 'Share your thoughts';
      let userPrompt = `The participants were asked: "${collectionPrompt}"

Group these ${submissions.length} responses into DISTINCT CATEGORIES. Focus on the SPECIFIC topics, not the general theme of the question.

${JSON.stringify(submissionsForAI, null, 2)}

Create meaningful groups based on the specific subject matter of each response. Each group should represent a distinct category of responses.`;

      // Append custom instructions if provided
      if (data.customInstructions && typeof data.customInstructions === 'string') {
        userPrompt += `\n\nADDITIONAL INSTRUCTIONS FROM THE HOST:\n${data.customInstructions}`;
      }

      // Call Gemini
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: EXTRACTION_PROMPT,
          temperature: 0.5,
          topP: 0.8,
          maxOutputTokens: 65536,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new HttpsError('internal', 'No response received from AI model');
      }

      // Parse topic extraction results
      const extractionResult = parseExtractionResponse(responseText);
      const { topics, summary } = extractionResult;

      // Initialize result object
      const topicsResult: {
        topics: TopicEntry[];
        totalSubmissions: number;
        processedAt: admin.firestore.FieldValue;
        summary?: string;
        slideId?: string;
        agentMatches?: TopicAgentMatch[];
        topMatureAgents?: MatchingAgent[];
      } = {
        topics,
        totalSubmissions: submissions.length,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(summary && { summary }),
        ...(data.slideId && { slideId: data.slideId }),
        ...(data.elementId && { elementId: data.elementId }),
      };

      // If agentic use cases collection is enabled, match topics with AI agents
      if (activityConfig?.agenticUseCasesCollection) {
        console.log('Agentic use cases collection enabled - matching topics with AI agents...');

        const agentMatches: TopicAgentMatch[] = [];
        const allMatchedAgents: MatchingAgent[] = [];

        for (const topic of topics) {
          try {
            // Create search text from topic name and description
            const searchText = `${topic.topic} ${topic.description}`;
            const matchingAgents = await findSimilarAgents(searchText, 3);

            agentMatches.push({
              topicName: topic.topic,
              matchingAgents,
            });

            // Collect all agents for top 5 calculation
            allMatchedAgents.push(...matchingAgents);

            console.log(`Matched ${matchingAgents.length} agents for topic: ${topic.topic}`);
          } catch (error) {
            console.error(`Error matching agents for topic "${topic.topic}":`, error);
            // Continue with other topics if one fails
            agentMatches.push({
              topicName: topic.topic,
              matchingAgents: [],
            });
          }
        }

        // Calculate top 5 most mature agents across all matches
        const topMatureAgents = getTopMatureAgents(allMatchedAgents, 5);

        topicsResult.agentMatches = agentMatches;
        topicsResult.topMatureAgents = topMatureAgents;

        console.log(`Found ${topMatureAgents.length} top mature agents across all topics`);
      }

      // Write topics to aggregates collection
      await db.collection('games').doc(data.gameId).collection('aggregates').doc(topicsDocId).set(topicsResult);

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
