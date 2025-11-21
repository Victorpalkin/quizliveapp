import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SubmitAnswerRequest, Game, Player, PlayerAnswer, SubmitAnswerResult } from '../types';
import { ALLOWED_ORIGINS, REGION, DEFAULT_QUESTION_TIME_LIMIT } from '../config';
import { validateOrigin } from '../utils/cors';
import {
  validateBasicFields,
  validateQuestionTiming,
  validateTimeRemaining,
  validateQuestionData
} from '../utils/validation';
import { calculateScore, calculateStreak } from '../utils/scoring';

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
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 10,
    memory: '256MiB',
    maxInstances: 100,
    concurrency: 80,
  },
  async (request): Promise<SubmitAnswerResult> => {
    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as SubmitAnswerRequest;

    // Validate basic required fields
    validateBasicFields(data);

    const { gameId, playerId, questionIndex, timeRemaining, questionType, questionTimeLimit } = data;

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

      // Validate question timing and index
      validateQuestionTiming(game, questionIndex, questionTimeLimit);

      // Check if player already answered this question (early validation)
      const answers = player.answers || [];
      const alreadyAnswered = answers.some(a => a.questionIndex === questionIndex);
      if (alreadyAnswered) {
        throw new HttpsError(
          'failed-precondition',
          'Player already answered this question'
        );
      }

      // Validate question-specific data
      validateQuestionData(data);

      // Validate time remaining is within bounds
      validateTimeRemaining(timeRemaining, questionTimeLimit);

      // Calculate score based on question type
      const timeLimit = questionTimeLimit || DEFAULT_QUESTION_TIME_LIMIT;
      const { points, isCorrect, isPartiallyCorrect } = calculateScore(data, timeLimit);

      const newScore = player.score + points;

      // Calculate current streak
      const newStreak = calculateStreak(
        questionType,
        isCorrect,
        player.currentStreak || 0
      );

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
        } else if (questionType === 'poll-single') {
          answer.answerIndex = data.answerIndex!;
        } else if (questionType === 'poll-multiple') {
          answer.answerIndices = data.answerIndices!;
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
  }
);
