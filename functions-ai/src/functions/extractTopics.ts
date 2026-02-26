import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import { findSimilarAgents, getTopMatureAgents, MatchingAgent } from '../utils/vectorSearch';

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

    // Verify this is a Thoughts Gathering game
    if (gameData?.activityType !== 'thoughts-gathering') {
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

      // Build the prompt with activity context
      const collectionPrompt = activityConfig?.prompt || 'Share your thoughts';
      const userPrompt = `The participants were asked: "${collectionPrompt}"

Group these ${submissions.length} responses into DISTINCT CATEGORIES. Focus on the SPECIFIC topics, not the general theme of the question.

${JSON.stringify(submissionsForAI, null, 2)}

Create meaningful groups based on the specific subject matter of each response. Each group should represent a distinct category of responses.`;

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
      const topics = parseExtractionResponse(responseText);

      // Initialize result object
      const topicsResult: {
        topics: TopicEntry[];
        totalSubmissions: number;
        processedAt: admin.firestore.FieldValue;
        agentMatches?: TopicAgentMatch[];
        topMatureAgents?: MatchingAgent[];
      } = {
        topics,
        totalSubmissions: submissions.length,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      await db.collection('games').doc(data.gameId).collection('aggregates').doc('topics').set(topicsResult);

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
