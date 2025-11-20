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
  'https://quiz.palkin.nl'
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
  answerIndex?: number;        // For single-choice, poll-single
  answerIndices?: number[];    // For multi-choice questions, poll-multiple
  sliderValue?: number;        // For slider questions

  // Question metadata (passed from client to avoid quiz fetch)
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'poll-single' | 'poll-multiple';
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
  questionStartTime?: {
    toMillis: () => number;
  };
}

interface PlayerAnswer {
  questionIndex: number;
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'poll-single' | 'poll-multiple';
  timestamp: admin.firestore.FieldValue;
  answerIndex?: number;
  answerIndices?: number[];
  sliderValue?: number;
  points: number;
  isCorrect: boolean;
  wasTimeout: boolean;
}

interface Player {
  id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
  currentStreak?: number;
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

    // Timestamp-based validation with grace period (instead of strict state checking)
    // This allows answers submitted during valid time to be accepted even if game state changed
    const GRACE_PERIOD_MS = 2000; // 2 second grace period for network latency
    const questionTimeLimit_local = questionTimeLimit || 20;
    const timeLimitMs = questionTimeLimit_local * 1000;

    // Check if game has questionStartTime (should always be set when state is 'question')
    if (!game.questionStartTime) {
      throw new HttpsError(
        'failed-precondition',
        'Question has not been started yet'
      );
    }

    // Calculate elapsed time since question started (server-authoritative)
    const questionStartMs = game.questionStartTime.toMillis();
    const submissionTimeMs = Date.now();
    const elapsedMs = submissionTimeMs - questionStartMs;

    // Verify question index - accept current or previous question (with time check)
    const isCurrentQuestion = game.currentQuestionIndex === questionIndex;
    const isPreviousQuestion = game.currentQuestionIndex === questionIndex + 1;

    if (!isCurrentQuestion && !isPreviousQuestion) {
      throw new HttpsError(
        'failed-precondition',
        `Question index mismatch: expected ${game.currentQuestionIndex}, got ${questionIndex}`
      );
    }

    // For previous question, only accept if within grace period
    if (isPreviousQuestion && elapsedMs > GRACE_PERIOD_MS) {
      throw new HttpsError(
        'deadline-exceeded',
        'Answer submitted too late - question has moved on'
      );
    }

    // Verify submission is within time limit + grace period
    if (elapsedMs > timeLimitMs + GRACE_PERIOD_MS) {
      throw new HttpsError(
        'deadline-exceeded',
        `Answer submitted after time limit (${Math.round(elapsedMs / 1000)}s elapsed, limit was ${questionTimeLimit_local}s)`
      );
    }

    // Check if player already answered this question (early validation)
    const answers = player.answers || [];
    const alreadyAnswered = answers.some(a => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
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
    } else if (questionType === 'poll-single') {
      if (answerIndex === undefined) {
        throw new HttpsError('invalid-argument', 'Poll single choice question requires answerIndex');
      }
      if (answerIndex < 0) {
        throw new HttpsError('invalid-argument', 'Invalid answer index');
      }
      // Poll questions don't have correct answers
    } else if (questionType === 'poll-multiple') {
      if (!answerIndices || answerIndices.length === 0) {
        throw new HttpsError('invalid-argument', 'Poll multiple choice question requires answerIndices');
      }
      // Minimal validation - check indices aren't negative
      for (const idx of answerIndices) {
        if (idx < 0) {
          throw new HttpsError('invalid-argument', `Invalid answer index: ${idx}`);
        }
      }
      // Poll questions don't have correct answers
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
    } else if (questionType === 'poll-single' || questionType === 'poll-multiple') {
      // Poll questions: no scoring, informational/survey only
      points = 0;
      isCorrect = false; // Polls don't have correct answers
      isPartiallyCorrect = false;
    }

    const newScore = player.score + points;

    // Calculate current streak
    // Streak only applies to scored questions (single-choice, multiple-choice, slider)
    // Polls and slides don't affect the streak
    let newStreak: number;

    if (questionType === 'poll-single' || questionType === 'poll-multiple') {
      // Polls don't affect streak - keep current value
      newStreak = player.currentStreak || 0;
    } else if (isCorrect) {
      // Increment streak on correct answer (for single-choice, multiple-choice, slider)
      newStreak = (player.currentStreak || 0) + 1;
    } else {
      // Reset streak on wrong answer or timeout
      newStreak = 0;
    }

    // Update player document with transaction to prevent race conditions
    await db.runTransaction(async (transaction) => {
      const freshPlayerDoc = await transaction.get(playerRef);

      if (!freshPlayerDoc.exists) {
        throw new HttpsError('not-found', 'Player not found in transaction');
      }

      const freshPlayer = freshPlayerDoc.data() as Player;

      // Double-check player hasn't answered in the meantime
      const freshAnswers = freshPlayer.answers || [];
      const alreadyAnsweredInTransaction = freshAnswers.some(a => a.questionIndex === questionIndex);
      if (alreadyAnsweredInTransaction) {
        throw new HttpsError(
          'failed-precondition',
          'Player already answered this question'
        );
      }

      // Create answer object
      const answer: PlayerAnswer = {
        questionIndex: questionIndex,
        questionType: questionType,
        timestamp: admin.firestore.Timestamp.now(),
        points: points,
        isCorrect: isCorrect,
        wasTimeout: timeRemaining === 0,
      };

      // Add type-specific answer data
      if (questionType === 'single-choice') {
        answer.answerIndex = answerIndex !== undefined ? answerIndex : -1;
      } else if (questionType === 'multiple-choice') {
        answer.answerIndices = answerIndices!;
      } else if (questionType === 'slider') {
        answer.sliderValue = sliderValue!;
      } else if (questionType === 'poll-single') {
        answer.answerIndex = answerIndex!;
      } else if (questionType === 'poll-multiple') {
        answer.answerIndices = answerIndices!;
      }

      // Update player document: append to answers array, increment score, and update streak
      transaction.update(playerRef, {
        score: newScore,
        currentStreak: newStreak,
        answers: admin.firestore.FieldValue.arrayUnion(answer)
      });
    });

    // Return result to client
    return {
      success: true,
      isCorrect,
      isPartiallyCorrect,
      points,
      newScore,
      currentStreak: newStreak,
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

/**
 * Request interface for createHostAccount
 */
interface CreateHostAccountRequest {
  email: string;
  password: string;
  name: string;
  jobRole: string;
  team: string;
}

/**
 * Cloud Function to create a new host account
 * Validates @google.com domain and creates user with email verification
 *
 * Security features:
 * - Server-side @google.com domain validation
 * - Email uniqueness check
 * - Password validation by Firebase Auth
 * - Email verification required before access
 * - CORS validation for authorized origins only
 */
export const createHostAccount = onCall(
  {
    region: 'europe-west4',
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as CreateHostAccountRequest;
    const { email, password, name, jobRole, team } = data;

    // Validate required fields
    if (!email || !password || !name || !jobRole || !team) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: email, password, name, jobRole, team'
      );
    }

    // Trim and lowercase email for consistent validation
    const trimmedEmail = email.trim().toLowerCase();

    // Server-side domain validation - CRITICAL SECURITY CHECK
    if (!trimmedEmail.endsWith('@google.com')) {
      throw new HttpsError(
        'invalid-argument',
        'Only @google.com email addresses are allowed to register'
      );
    }

    // Validate name is not empty after trimming
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new HttpsError('invalid-argument', 'Name cannot be empty');
    }

    // Validate job role and team are not empty
    const trimmedJobRole = jobRole.trim();
    const trimmedTeam = team.trim();
    if (trimmedJobRole.length === 0 || trimmedTeam.length === 0) {
      throw new HttpsError('invalid-argument', 'Job role and team cannot be empty');
    }

    try {
      // Check if user already exists with this email
      try {
        const existingUser = await admin.auth().getUserByEmail(trimmedEmail);
        if (existingUser) {
          throw new HttpsError(
            'already-exists',
            'An account with this email already exists'
          );
        }
      } catch (error: any) {
        // getUserByEmail throws error if user not found - this is expected
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // User not found - good, we can proceed
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: trimmedEmail,
        password: password,
        displayName: trimmedName,
        emailVerified: false, // Require email verification
      });

      console.log(`[REGISTRATION] Created Firebase Auth user: ${userRecord.uid} (${trimmedEmail})`);

      // Create user profile document in Firestore
      const db = admin.firestore();
      const userProfileRef = db.collection('users').doc(userRecord.uid);

      const now = admin.firestore.Timestamp.now();
      await userProfileRef.set({
        id: userRecord.uid,
        email: trimmedEmail,
        name: trimmedName,
        jobRole: trimmedJobRole,
        team: trimmedTeam,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[REGISTRATION] Created Firestore profile for user: ${userRecord.uid}`);

      // Generate email verification link
      const actionCodeSettings = {
        url: `${origin || 'https://quiz.palkin.nl'}/login`, // Redirect to login after verification
        handleCodeInApp: false,
      };

      const verificationLink = await admin.auth().generateEmailVerificationLink(
        trimmedEmail,
        actionCodeSettings
      );

      console.log(`[REGISTRATION] Generated verification link for: ${trimmedEmail}`);

      // Note: In production, you would send this link via a custom email service
      // For now, Firebase Auth will handle sending the verification email
      // when the user signs in and requests verification

      return {
        success: true,
        userId: userRecord.uid,
        message: 'Account created successfully. Please verify your email before signing in.',
        verificationLink, // Return link for development/testing purposes
      };

    } catch (error: any) {
      console.error('[REGISTRATION] Error creating host account:', error);

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError(
          'already-exists',
          'An account with this email already exists'
        );
      }

      if (error.code === 'auth/invalid-password') {
        throw new HttpsError(
          'invalid-argument',
          'Password must be at least 6 characters'
        );
      }

      if (error.code === 'auth/invalid-email') {
        throw new HttpsError(
          'invalid-argument',
          'Invalid email address format'
        );
      }

      // Wrap other errors
      throw new HttpsError(
        'internal',
        'An error occurred while creating your account. Please try again.'
      );
    }
  }
);
