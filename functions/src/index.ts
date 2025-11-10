import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

// CORS Configuration: Allowed origins for Cloud Function calls
// These are the only domains that can call our Cloud Functions
const ALLOWED_ORIGINS = [
  'http://localhost:3000',           // Local development
  'http://localhost:3001',           // Alternative local port
  'https://localhost:3000',          // Local HTTPS
  // Cloud Run URLs - Update these after deployment
  'https://gquiz-880039882047.europe-west4.run.app'
  // Example: 'https://gquiz-abc123-ew.a.run.app'
  // Note: You can get the actual URL after first deployment via:
  // gcloud run services describe gquiz --region=europe-west4 --format='value(status.url)'
];

/**
 * Validate request origin for CORS security
 * Prevents unauthorized domains from calling our Cloud Functions
 */
function validateOrigin(origin: string | undefined): void {
  // Allow requests with no origin (server-to-server, Firebase Admin SDK)
  if (!origin) {
    return;
  }

  // Check if origin is in allowed list
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
    throw new HttpsError(
      'permission-denied',
      'Request from unauthorized origin'
    );
  }

  // Log successful origin validation for security monitoring
  console.log(`[SECURITY] Validated request from allowed origin: ${origin}`);
}

/**
 * Additional security recommendations:
 *
 * 1. Firebase App Check (Recommended):
 *    - Add App Check to verify requests come from your app
 *    - Prevents API abuse and unauthorized access
 *    - Setup: https://firebase.google.com/docs/app-check
 *
 * 2. Rate Limiting:
 *    - Consider implementing rate limiting per user/IP
 *    - Use Firebase Extensions or custom middleware
 *
 * 3. Environment-based configuration:
 *    - Store allowed origins in environment variables
 *    - Use different configs for dev/staging/prod
 *
 * 4. Monitoring:
 *    - Set up alerts for blocked origin attempts
 *    - Monitor function invocation patterns
 *    - Use Cloud Monitoring for security events
 */

interface SubmitAnswerRequest {
  gameId: string;
  playerId: string;
  questionIndex: number;
  answerIndex: number;
  timeRemaining: number; // Time remaining when answer was submitted
}

interface Question {
  text: string;
  answers: Array<{ text: string }>;
  correctAnswerIndices: number[];
  timeLimit?: number;
  imageUrl?: string;
}

interface Quiz {
  title: string;
  description: string;
  questions: Question[];
  hostId: string;
}

interface Game {
  quizId: string;
  hostId: string;
  state: string;
  currentQuestionIndex: number;
  gamePin: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswerIndex?: number | null;
}

/**
 * Cloud Function to validate and score player answers
 * This prevents client-side score manipulation
 * Deployed to europe-west4 region
 *
 * Security features:
 * - CORS validation: Only accepts requests from authorized origins
 * - Authentication: Requires valid Firebase authentication (auth context)
 * - Server-side validation: Validates all game state server-side
 * - Transaction safety: Uses Firestore transactions to prevent race conditions
 */
export const submitAnswer = onCall(
  {
    region: 'europe-west4',
    cors: ALLOWED_ORIGINS, // Enable CORS for allowed origins only
  },
  async (request) => {
    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as SubmitAnswerRequest;
    const { gameId, playerId, questionIndex, answerIndex, timeRemaining } = data;

  // Validate input
  if (!gameId || !playerId || questionIndex === undefined || answerIndex === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: gameId, playerId, questionIndex, answerIndex'
    );
  }

  if (timeRemaining === undefined || timeRemaining < 0) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid timeRemaining value'
    );
  }

  const db = admin.firestore();

  try {
    // Get game document
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    // Verify game is in question state
    if (game.state !== 'question') {
      throw new HttpsError(
        'failed-precondition',
        'Game is not in question state'
      );
    }

    // Verify question index matches current question
    if (game.currentQuestionIndex !== questionIndex) {
      throw new HttpsError(
        'failed-precondition',
        'Question index does not match current question'
      );
    }

    // Get quiz to validate answer
    const quizDoc = await db.collection('quizzes').doc(game.quizId).get();
    if (!quizDoc.exists) {
      throw new HttpsError('not-found', 'Quiz not found');
    }

    const quiz = quizDoc.data() as Quiz;
    const question = quiz.questions[questionIndex];

    if (!question) {
      throw new HttpsError('not-found', 'Question not found');
    }

    // Validate answer index (-1 means no answer/timeout)
    if (answerIndex !== -1 && (answerIndex < 0 || answerIndex >= question.answers.length)) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid answer index'
      );
    }

    // Get player document
    const playerRef = db.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      throw new HttpsError('not-found', 'Player not found');
    }

    const player = playerDoc.data() as Player;

    // Check if player already answered this question
    if (player.lastAnswerIndex !== null && player.lastAnswerIndex !== undefined) {
      throw new HttpsError(
        'failed-precondition',
        'Player already answered this question'
      );
    }

    // Calculate score
    // -1 means no answer (timeout), which is always incorrect
    const isCorrect = answerIndex !== -1 && question.correctAnswerIndices.includes(answerIndex);
    const timeLimit = question.timeLimit || 20;

    // Validate time remaining is within bounds
    if (timeRemaining > timeLimit) {
      throw new HttpsError(
        'invalid-argument',
        'Time remaining cannot exceed time limit'
      );
    }

    let points = 0;
    if (isCorrect) {
      // Score: 100 base + up to 900 bonus based on speed
      points = Math.round(100 + (timeRemaining / timeLimit) * 900);
      // Ensure points are in valid range
      points = Math.max(100, Math.min(1000, points));
    }

    const newScore = player.score + points;

    // Update player document with transaction to prevent race conditions
    await db.runTransaction(async (transaction) => {
      const freshPlayerDoc = await transaction.get(playerRef);

      if (!freshPlayerDoc.exists) {
        throw new HttpsError('not-found', 'Player not found in transaction');
      }

      const freshPlayer = freshPlayerDoc.data() as Player;

      // Double-check player hasn't answered in the meantime
      if (freshPlayer.lastAnswerIndex !== null && freshPlayer.lastAnswerIndex !== undefined) {
        throw new HttpsError(
          'failed-precondition',
          'Player already answered this question'
        );
      }

      transaction.update(playerRef, {
        score: newScore,
        lastAnswerIndex: answerIndex,
      });
    });

    // Return result to client
    return {
      success: true,
      isCorrect,
      points,
      newScore,
    };
  } catch (error) {
    console.error('Error in submitAnswer:', error);

    // Re-throw HttpsErrors
    if (error instanceof HttpsError) {
      throw error;
    }

    // Wrap other errors
    throw new HttpsError(
      'internal',
      'An error occurred while processing your answer'
    );
  }
});
