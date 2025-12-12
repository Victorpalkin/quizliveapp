import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';

interface EvaluateSubmissionsRequest {
  gameId: string;
  topicPrompt: string;
  questionsNeeded: number;
}

interface EvaluateSubmissionsResponse {
  success: boolean;
  evaluatedCount: number;
  selectedCount: number;
}

interface QuestionSubmission {
  id: string;
  playerId: string;
  playerName: string;
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
  aiScore?: number;
  aiReasoning?: string;
  aiSelected?: boolean;
}

interface EvaluationResult {
  submissionId: string;
  score: number;
  reasoning: string;
}

// System prompt for evaluating crowdsourced questions
const EVALUATION_PROMPT = `You are evaluating trivia questions submitted by players for a live quiz game.

Your task is to score each question from 0-100 based on the following criteria:
- Topic relevance (0-25): How well does the question match the specified topic?
- Clarity (0-20): Is the question clear and unambiguous?
- Difficulty balance (0-15): Is it challenging but fair? (not too easy, not impossibly hard)
- Answer correctness (0-25): Is the marked correct answer ACTUALLY correct? Penalize heavily if wrong!
- Distractor quality (0-15): Are the wrong answers plausible but clearly incorrect?

CRITICAL: The "correctAnswerIndex" field indicates which answer the player marked as correct (0-indexed).
You MUST verify this is factually accurate. If the marked answer is WRONG, give a score of 0-20 maximum.

Respond ONLY with valid JSON in this exact format:
{
  "evaluations": [
    {
      "submissionId": "id1",
      "score": 85,
      "reasoning": "Great question about X, correct answer verified, good distractors"
    },
    {
      "submissionId": "id2",
      "score": 15,
      "reasoning": "The marked correct answer is factually wrong - Paris is not the capital of Germany"
    }
  ]
}

Guidelines:
- Be fair and consistent in scoring
- ALWAYS verify the marked correct answer is factually accurate
- Penalize off-topic questions heavily (score < 30)
- Penalize unclear or ambiguous questions
- Reward creative, engaging questions that match the topic
- Consider whether players would enjoy answering this question`;

/**
 * Parse the AI evaluation response
 */
function parseEvaluationResponse(responseText: string): EvaluationResult[] {
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

    if (!parsed.evaluations || !Array.isArray(parsed.evaluations)) {
      throw new Error('Invalid evaluation structure');
    }

    return parsed.evaluations.map((e: { submissionId: string; score: number; reasoning: string }) => ({
      submissionId: e.submissionId,
      score: Math.min(100, Math.max(0, Math.round(e.score))),
      reasoning: e.reasoning || '',
    }));
  } catch (error) {
    console.error('Failed to parse evaluation response:', responseText);
    throw new HttpsError('internal', 'Failed to parse AI evaluation response');
  }
}

/**
 * Cloud Function to evaluate crowdsourced question submissions using Gemini
 */
export const evaluateSubmissions = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 120, // Allow more time for multiple submissions
    memory: '512MiB',
    maxInstances: 5,
    concurrency: 5,
    serviceAccount: AI_SERVICE_ACCOUNT,
    // App Check enabled - verifies requests come from genuine app instances
    enforceAppCheck: true,
  },
  async (request): Promise<EvaluateSubmissionsResponse> => {
    verifyAppCheck(request);

    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to evaluate submissions');
    }

    const data = request.data as EvaluateSubmissionsRequest;

    // Validate input
    if (!data.gameId || typeof data.gameId !== 'string') {
      throw new HttpsError('invalid-argument', 'Game ID is required');
    }
    if (!data.topicPrompt || typeof data.topicPrompt !== 'string') {
      throw new HttpsError('invalid-argument', 'Topic prompt is required');
    }
    if (!data.questionsNeeded || typeof data.questionsNeeded !== 'number' || data.questionsNeeded < 1) {
      throw new HttpsError('invalid-argument', 'Questions needed must be a positive number');
    }

    const db = admin.firestore();

    // Verify the user is the host of this game
    const gameDoc = await db.collection('games').doc(data.gameId).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data();
    if (gameData?.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the game host can evaluate submissions');
    }

    // Get all submissions for this game
    const submissionsSnapshot = await db
      .collection('games')
      .doc(data.gameId)
      .collection('submissions')
      .get();

    if (submissionsSnapshot.empty) {
      // No submissions to evaluate
      await db.collection('games').doc(data.gameId).update({
        'crowdsourceState.evaluationComplete': true,
        'crowdsourceState.selectedCount': 0,
      });

      return {
        success: true,
        evaluatedCount: 0,
        selectedCount: 0,
      };
    }

    // Prepare submissions for evaluation
    const submissions: QuestionSubmission[] = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<QuestionSubmission, 'id'>,
    }));

    // Build the evaluation request - include correctAnswerIndex so AI can validate accuracy
    const submissionsForAI = submissions.map(s => ({
      submissionId: s.id,
      questionText: s.questionText,
      answers: s.answers,
      correctAnswerIndex: s.correctAnswerIndex, // AI needs this to verify answer is correct
      playerName: s.playerName,
    }));

    try {
      // Initialize Gemini client
      const client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
      });

      // Build the prompt
      const userPrompt = `Topic: "${data.topicPrompt}"

Evaluate these ${submissions.length} question submissions:

${JSON.stringify(submissionsForAI, null, 2)}

Score each question from 0-100 based on how well it fits the topic and quiz quality criteria.`;

      // Call Gemini
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: EVALUATION_PROMPT,
          temperature: 0.3, // Lower temperature for more consistent scoring
          topP: 0.8,
          maxOutputTokens: 4096,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new HttpsError('internal', 'No response received from AI model');
      }

      // Parse evaluation results
      const evaluations = parseEvaluationResponse(responseText);

      // Create a map for quick lookup
      const evalMap = new Map<string, EvaluationResult>();
      for (const e of evaluations) {
        evalMap.set(e.submissionId, e);
      }

      // Sort by score and select top N
      const sortedSubmissions = [...submissions].sort((a, b) => {
        const scoreA = evalMap.get(a.id)?.score || 0;
        const scoreB = evalMap.get(b.id)?.score || 0;
        return scoreB - scoreA;
      });

      const selectedIds = new Set(
        sortedSubmissions.slice(0, data.questionsNeeded).map(s => s.id)
      );

      // Update each submission with evaluation results
      const batch = db.batch();

      for (const sub of submissions) {
        const evaluation = evalMap.get(sub.id);
        const subRef = db.collection('games').doc(data.gameId).collection('submissions').doc(sub.id);

        batch.update(subRef, {
          aiScore: evaluation?.score || 0,
          aiReasoning: evaluation?.reasoning || 'Could not evaluate this submission',
          aiSelected: selectedIds.has(sub.id),
        });
      }

      // Update game crowdsource state
      const gameRef = db.collection('games').doc(data.gameId);
      batch.update(gameRef, {
        'crowdsourceState.evaluationComplete': true,
        'crowdsourceState.selectedCount': selectedIds.size,
      });

      await batch.commit();

      console.log(`Evaluated ${submissions.length} submissions for game ${data.gameId}, selected ${selectedIds.size}`);

      return {
        success: true,
        evaluatedCount: submissions.length,
        selectedCount: selectedIds.size,
      };
    } catch (error) {
      console.error('Error evaluating submissions:', error);

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

      throw new HttpsError('internal', 'Failed to evaluate submissions. Please try again.');
    }
  }
);
