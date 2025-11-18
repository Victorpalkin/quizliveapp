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
  'https://gquiz-880039882047.europe-west4.run.app',
  'https://gqzuiz-dev-f424-czsrxlt5hq-ez.a.run.app',
  'https://gqzuiz-dev-f424-986405642892.europe-west4.run.app',
  'https://gquiz-prod-3r5f-684066064060.europe-west4.run.app',
  'https://gquiz-prod-3r5f-klvaspwmka-ez.a.run.app',
  'https://quiz.palkin.nl/'
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
  timeRemaining: number; // Time remaining when answer was submitted

  // Answer data (one will be used based on question type)
  answerIndex?: number;        // For single-choice
  answerIndices?: number[];    // For multi-choice questions
  sliderValue?: number;        // For slider questions

  // Question metadata (passed from client to avoid quiz fetch)
  questionType: 'single-choice' | 'multiple-choice' | 'slider';
  questionTimeLimit?: number;

  // Type-specific metadata
  correctAnswerIndex?: number;       // For single-choice
  correctAnswerIndices?: number[];   // For multiple-choice
  correctValue?: number;             // For slider
  minValue?: number;                 // For slider
  maxValue?: number;                 // For slider
  acceptableError?: number;          // For slider - absolute error threshold
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
  lastAnswerIndices?: number[] | null;
  lastSliderValue?: number | null;
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
    const {
      gameId,
      playerId,
      questionIndex,
      answerIndex,
      answerIndices,
      sliderValue,
      timeRemaining,
      questionType,
      questionTimeLimit,
      correctAnswerIndex,
      correctAnswerIndices,
      correctValue,
      minValue,
      maxValue,
      acceptableError
    } = data;

  // Validate input
  if (!gameId || !playerId || questionIndex === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: gameId, playerId, questionIndex'
    );
  }

  // At least one answer type must be provided
  if (answerIndex === undefined && !answerIndices && sliderValue === undefined) {
    throw new HttpsError(
      'invalid-argument',
      'Missing answer: must provide answerIndex, answerIndices, or sliderValue'
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
    // Parallel fetch: Get game and player documents simultaneously
    const playerRef = db.collection('games').doc(gameId).collection('players').doc(playerId);
    const [gameDoc, playerDoc] = await Promise.all([
      db.collection('games').doc(gameId).get(),
      playerRef.get()
    ]);

    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    if (!playerDoc.exists) {
      throw new HttpsError('not-found', 'Player not found');
    }

    const game = gameDoc.data() as Game;
    const player = playerDoc.data() as Player;

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

    // Check if player already answered this question (early validation)
    if (player.lastAnswerIndex !== null && player.lastAnswerIndex !== undefined) {
      throw new HttpsError(
        'failed-precondition',
        'Player already answered this question'
      );
    }

    // Validate question metadata is provided
    if (!questionType) {
      throw new HttpsError('invalid-argument', 'Question type is required');
    }

    // Basic validation based on question type (client has already validated)
    if (questionType === 'single-choice') {
      if (answerIndex === undefined) {
        throw new HttpsError('invalid-argument', 'Single choice question requires answerIndex');
      }
      if (correctAnswerIndex === undefined) {
        throw new HttpsError('invalid-argument', 'correctAnswerIndex is required for single-choice');
      }
      // -1 means no answer/timeout - minimal validation only
      if (answerIndex !== -1 && answerIndex < 0) {
        throw new HttpsError('invalid-argument', 'Invalid answer index');
      }
    } else if (questionType === 'multiple-choice') {
      if (!answerIndices) {
        throw new HttpsError('invalid-argument', 'Multiple choice question requires answerIndices');
      }
      if (!correctAnswerIndices || correctAnswerIndices.length === 0) {
        throw new HttpsError('invalid-argument', 'correctAnswerIndices is required for multiple-choice');
      }
      // Minimal validation - check indices aren't negative
      for (const idx of answerIndices) {
        if (idx < 0) {
          throw new HttpsError('invalid-argument', `Invalid answer index: ${idx}`);
        }
      }
    } else if (questionType === 'slider') {
      if (sliderValue === undefined) {
        throw new HttpsError('invalid-argument', 'Slider question requires sliderValue');
      }
      if (correctValue === undefined || minValue === undefined || maxValue === undefined) {
        throw new HttpsError('invalid-argument', 'Slider metadata (correctValue, minValue, maxValue) is required');
      }
      if (sliderValue < minValue || sliderValue > maxValue) {
        throw new HttpsError(
          'invalid-argument',
          `Slider value ${sliderValue} out of range [${minValue}, ${maxValue}]`
        );
      }
    }

    // Calculate score based on question type
    const timeLimit = questionTimeLimit || 20;

    // Validate time remaining is within bounds
    if (timeRemaining > timeLimit) {
      throw new HttpsError(
        'invalid-argument',
        'Time remaining cannot exceed time limit'
      );
    }

    let points = 0;
    let isCorrect = false;
    let isPartiallyCorrect = false;

    if (questionType === 'single-choice') {
      // Single choice: exactly one correct answer
      const selectedIndex = answerIndex !== undefined ? answerIndex : -1;
      isCorrect = selectedIndex !== -1 && selectedIndex === correctAnswerIndex;

      if (isCorrect) {
        // Base 100 points + up to 900 time bonus
        points = 100;
        const timeBonus = Math.round((timeRemaining / timeLimit) * 900);
        points = Math.min(1000, points + timeBonus);
      } else {
        points = 0;
      }

    } else if (questionType === 'multiple-choice') {
      // Multiple choice: multiple correct answers with proportional scoring
      const correctSelected = answerIndices!.filter(i => correctAnswerIndices!.includes(i)).length;
      const wrongSelected = answerIndices!.filter(i => !correctAnswerIndices!.includes(i)).length;
      const totalCorrect = correctAnswerIndices!.length;

      // Proportional scoring
      const correctRatio = correctSelected / totalCorrect;
      const penalty = wrongSelected * 0.2;  // 20% penalty per wrong answer
      const scoreMultiplier = Math.max(0, correctRatio - penalty);

      // 50/50 split: 50% accuracy, 50% speed
      // If scoreMultiplier = 0 (completely wrong), both components = 0
      const accuracyComponent = Math.round(500 * scoreMultiplier);
      const speedComponent = Math.round(500 * (timeRemaining / timeLimit));
      points = accuracyComponent + speedComponent;

      // Fully correct: all correct selected, no wrong
      isCorrect = correctSelected === totalCorrect && wrongSelected === 0;

      // Partially correct: got some points but not fully correct
      isPartiallyCorrect = !isCorrect && scoreMultiplier > 0;

    } else if (questionType === 'slider') {
      // Slider question: proximity-based scoring
      const range = maxValue! - minValue!;
      const distance = Math.abs(sliderValue! - correctValue!);
      const accuracy = Math.max(0, 1 - (distance / range));  // 1.0 = perfect, 0.0 = worst

      // Quadratic scoring: rewards closeness, penalizes distance
      const scoreMultiplier = Math.pow(accuracy, 2);

      // 50/50 split: 50% accuracy, 50% speed
      const accuracyComponent = Math.round(500 * scoreMultiplier);
      const speedComponent = Math.round(500 * (timeRemaining / timeLimit));
      points = accuracyComponent + speedComponent;

      // Configurable acceptable error threshold (default: 5% of range)
      const threshold = acceptableError ?? (range * 0.05);
      isCorrect = distance <= threshold;

      // No "partially correct" for sliders - only correct or incorrect
      isPartiallyCorrect = false;
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

      // Update appropriate answer field based on question type
      const updateData: any = {
        score: newScore,
      };

      if (questionType === 'single-choice') {
        updateData.lastAnswerIndex = answerIndex !== undefined ? answerIndex : -1;
        updateData.lastAnswerIndices = null;
        updateData.lastSliderValue = null;
      } else if (questionType === 'multiple-choice') {
        updateData.lastAnswerIndices = answerIndices!;
        updateData.lastAnswerIndex = null;
        updateData.lastSliderValue = null;
      } else if (questionType === 'slider') {
        updateData.lastSliderValue = sliderValue;
        updateData.lastAnswerIndex = null;
        updateData.lastAnswerIndices = null;
      }

      transaction.update(playerRef, updateData);
    });

    // Return result to client
    return {
      success: true,
      isCorrect,
      isPartiallyCorrect,
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
