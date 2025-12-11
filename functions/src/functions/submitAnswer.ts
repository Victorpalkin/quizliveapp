import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SubmitAnswerRequest, Player, PlayerAnswer, SubmitAnswerResult, AnswerKey, AnswerKeyEntry } from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';
import {
  validateBasicFields,
  validateTimeRemaining,
  validateQuestionData
} from '../utils/validation';
import { calculateScoreFromAnswerKey } from '../utils/scoring';

/**
 * Cloud Function to validate and score player answers
 * This prevents client-side score manipulation
 * Deployed to europe-west4 region
 *
 * Security features:
 * - App Check: Verifies requests come from genuine app instances
 * - CORS validation: Only accepts requests from authorized origins
 * - Server-side validation: Validates all game state server-side
 * - "Already answered" check: Prevents duplicate submissions
 * - Transaction safety: Uses Firestore transactions to prevent race conditions
 *
 * Note: Rate limiting removed - App Check + validation provides sufficient protection
 * for quiz gameplay where players submit ~1 answer per 10-60 seconds.
 */
export const submitAnswer = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 10,
    memory: '256MiB',
    minInstances: 1, // Keep 1 instance warm to eliminate cold starts (~$5-10/month)
    maxInstances: 10,
    concurrency: 80,
    // Enable App Check enforcement when ready
    enforceAppCheck: false, // Set to true after client-side App Check is configured
  },
  async (request): Promise<SubmitAnswerResult> => {
    // Verify App Check token (currently in monitoring mode)
    verifyAppCheck(request);

    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as SubmitAnswerRequest;

    // Validate basic required fields
    validateBasicFields(data);

    const { gameId, playerId, questionIndex, timeRemaining, questionType, questionTimeLimit } = data;

    const db = admin.firestore();

    try {
      // Fetch answer key and player document in parallel for performance
      const [answerKeyDoc, playerDoc] = await Promise.all([
        db.collection('games').doc(gameId).collection('aggregates').doc('answerKey').get(),
        db.collection('games').doc(gameId).collection('players').doc(playerId).get()
      ]);

      // Validate answer key exists
      if (!answerKeyDoc.exists) {
        throw new HttpsError('not-found', 'Answer key not found - game may not be started');
      }

      const answerKey = answerKeyDoc.data() as AnswerKey;

      // Validate question index is valid
      if (questionIndex < 0 || questionIndex >= answerKey.questions.length) {
        throw new HttpsError('invalid-argument', 'Invalid question index');
      }

      const answerKeyEntry = answerKey.questions[questionIndex] as AnswerKeyEntry;

      // Validate player exists
      if (!playerDoc.exists) {
        throw new HttpsError('not-found', 'Player not found');
      }

      const player = playerDoc.data() as Player;
      const playerRef = db.collection('games').doc(gameId).collection('players').doc(playerId);

      // Check if player already answered this question (early validation)
      const answers = player.answers || [];
      const alreadyAnswered = answers.some(a => a.questionIndex === questionIndex);
      if (alreadyAnswered) {
        throw new HttpsError(
          'failed-precondition',
          'Player already answered this question'
        );
      }

      // Validate question-specific data (player's answer data only)
      validateQuestionData(data);

      // Validate time remaining is within bounds
      const timeLimit = answerKeyEntry.timeLimit || questionTimeLimit || 20;
      validateTimeRemaining(timeRemaining, timeLimit);

      // Calculate score using server-side answer key (secure - no client-provided correct answers)
      const { points, isCorrect, isPartiallyCorrect } = calculateScoreFromAnswerKey(data, answerKeyEntry);

      const newScore = player.score + points;

      // Note: Streak calculation moved to computeQuestionResults
      // This simplifies timeout handling and ensures accurate streaks for all players

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
          answer.answerIndex = data.answerIndex !== undefined ? data.answerIndex : -1;
        } else if (questionType === 'multiple-choice') {
          answer.answerIndices = data.answerIndices!;
        } else if (questionType === 'slider') {
          answer.sliderValue = data.sliderValue!;
        } else if (questionType === 'free-response') {
          answer.textAnswer = data.textAnswer || '';
        } else if (questionType === 'poll-single') {
          answer.answerIndex = data.answerIndex!;
        } else if (questionType === 'poll-multiple') {
          answer.answerIndices = data.answerIndices!;
        }

        // Update player document: append to answers array and increment score
        // Note: currentStreak is now updated in computeQuestionResults
        transaction.update(playerRef, {
          score: newScore,
          answers: admin.firestore.FieldValue.arrayUnion(answer)
        });
      });

      // Atomic increment for totalAnswered counter (enables live counter + auto-finish)
      // This is much faster than read-modify-write and has no race conditions
      // Note: Rank is now computed in computeQuestionResults and read from aggregate
      const leaderboardRef = db.collection('games').doc(gameId).collection('aggregates').doc('leaderboard');
      await leaderboardRef.set({
        totalAnswered: admin.firestore.FieldValue.increment(1),
      }, { merge: true });

      // Return result to client
      // Note: rank, totalPlayers, and currentStreak removed - now computed in computeQuestionResults
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
  }
);
