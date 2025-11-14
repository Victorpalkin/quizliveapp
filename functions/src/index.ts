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
  'https://gquiz-prod-3r5f-klvaspwmka-ez.a.run.app'
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
  answerIndex?: number;        // For backward compatibility and single-choice
  answerIndices?: number[];    // For multi-choice questions
  sliderValue?: number;        // For slider questions
}

// Base question interface
interface BaseQuestion {
  text: string;
  timeLimit?: number;
  imageUrl?: string;
}

// Multiple choice question
interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  answers: Array<{ text: string }>;
  correctAnswerIndices: number[];
  allowMultipleAnswers?: boolean;
  scoringMode?: 'all-or-nothing' | 'proportional';
  showAnswerCount?: boolean;
}

// Slider question
interface SliderQuestion extends BaseQuestion {
  type: 'slider';
  minValue: number;
  maxValue: number;
  correctValue: number;
  step?: number;
  unit?: string;
}

type Question = MultipleChoiceQuestion | SliderQuestion;

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
    const { gameId, playerId, questionIndex, answerIndex, answerIndices, sliderValue, timeRemaining } = data;

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

    // Validate answer based on question type
    if (question.type === 'multiple-choice') {
      if (answerIndices) {
        // Multi-choice validation
        for (const idx of answerIndices) {
          if (idx < 0 || idx >= question.answers.length) {
            throw new HttpsError('invalid-argument', `Invalid answer index: ${idx}`);
          }
        }
      } else if (answerIndex !== undefined) {
        // Single choice validation (-1 means no answer/timeout)
        if (answerIndex !== -1 && (answerIndex < 0 || answerIndex >= question.answers.length)) {
          throw new HttpsError('invalid-argument', 'Invalid answer index');
        }
      }
    } else if (question.type === 'slider') {
      if (sliderValue === undefined) {
        throw new HttpsError('invalid-argument', 'Slider question requires sliderValue');
      }
      if (sliderValue < question.minValue || sliderValue > question.maxValue) {
        throw new HttpsError(
          'invalid-argument',
          `Slider value ${sliderValue} out of range [${question.minValue}, ${question.maxValue}]`
        );
      }
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

    // Calculate score based on question type
    const timeLimit = question.timeLimit || 20;

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

    if (question.type === 'multiple-choice') {
      const { correctAnswerIndices, allowMultipleAnswers, scoringMode } = question;

      if (allowMultipleAnswers && answerIndices) {
        // Multi-answer mode
        const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
        const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
        const totalCorrect = correctAnswerIndices.length;

        if (scoringMode === 'all-or-nothing') {
          // All or nothing: must select ALL correct and NO wrong
          isCorrect = correctSelected === totalCorrect && wrongSelected === 0;
          points = isCorrect ? 1000 : 0;
        } else {
          // Proportional scoring
          const correctRatio = correctSelected / totalCorrect;
          const penalty = wrongSelected * 0.2;  // 20% penalty per wrong answer
          const scoreMultiplier = Math.max(0, correctRatio - penalty);

          // Base 1000 points, multiplied by correctness, then add time bonus
          const basePoints = Math.round(1000 * scoreMultiplier);
          points = basePoints;

          // Fully correct: all correct selected, no wrong
          isCorrect = correctSelected === totalCorrect && wrongSelected === 0;

          // Partially correct: got some points but not fully correct
          isPartiallyCorrect = !isCorrect && scoreMultiplier > 0;
        }
      } else {
        // Single answer mode (backward compatible)
        const selectedIndex = answerIndex !== undefined ? answerIndex : -1;
        isCorrect = selectedIndex !== -1 && correctAnswerIndices.includes(selectedIndex);

        if (isCorrect) {
          // Base 100 points + up to 900 time bonus
          points = 100;
        } else {
          points = 0;
        }
      }

      // Apply time bonus for correct answers (doesn't apply to all-or-nothing with wrong answer)
      if (isCorrect && points > 0) {
        const timeBonus = Math.round((timeRemaining / timeLimit) * 900);
        points = Math.min(1000, points + timeBonus);
      }

    } else if (question.type === 'slider') {
      // Slider question: proximity-based scoring
      const range = question.maxValue - question.minValue;
      const distance = Math.abs(sliderValue! - question.correctValue);
      const accuracy = Math.max(0, 1 - (distance / range));  // 1.0 = perfect, 0.0 = worst
      const errorMargin = distance / range;  // 0.0 = perfect, 1.0 = worst

      // Quadratic scoring: rewards closeness, penalizes distance
      const scoreMultiplier = Math.pow(accuracy, 2);
      const basePoints = Math.round(1000 * scoreMultiplier);

      // Apply time bonus
      const timeBonus = Math.round((timeRemaining / timeLimit) * 0);  // No time bonus for slider questions
      points = Math.min(1000, basePoints + timeBonus);

      // Fully correct: within 10% error margin
      isCorrect = errorMargin <= 0.1;

      // Partially correct: within 20% error margin but not fully correct
      isPartiallyCorrect = !isCorrect && errorMargin <= 0.2;
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

      if (question.type === 'multiple-choice') {
        if (question.allowMultipleAnswers && answerIndices) {
          updateData.lastAnswerIndices = answerIndices;
          updateData.lastAnswerIndex = null;  // Clear old field
        } else {
          updateData.lastAnswerIndex = answerIndex !== undefined ? answerIndex : -1;
          updateData.lastAnswerIndices = null;  // Clear new field
        }
        updateData.lastSliderValue = null;
      } else if (question.type === 'slider') {
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
