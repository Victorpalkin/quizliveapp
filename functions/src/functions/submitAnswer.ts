import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SubmitAnswerRequest, Game, Player, PlayerAnswer, SubmitAnswerResult, LeaderboardEntry, GameLeaderboard } from '../types';
import { ALLOWED_ORIGINS, REGION, DEFAULT_QUESTION_TIME_LIMIT } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';
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
        } else if (questionType === 'free-response') {
          answer.textAnswer = data.textAnswer || '';
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

      // Calculate rank efficiently by counting players with higher scores
      // This avoids the O(n²) problem of each client subscribing to all players
      const playersRef = db.collection('games').doc(gameId).collection('players');
      const [higherScoreSnapshot, totalPlayersSnapshot] = await Promise.all([
        playersRef.where('score', '>', newScore).count().get(),
        playersRef.count().get()
      ]);

      const playersWithHigherScore = higherScoreSnapshot.data().count;
      const totalPlayers = totalPlayersSnapshot.data().count;
      const rank = playersWithHigherScore + 1; // Rank is 1-indexed

      // Update leaderboard aggregate for host-side performance
      // This allows the host to subscribe to 1 document instead of N player documents
      const leaderboardRef = db.collection('games').doc(gameId).collection('aggregates').doc('leaderboard');
      const leaderboardDoc = await leaderboardRef.get();
      const currentLeaderboard = leaderboardDoc.exists
        ? leaderboardDoc.data() as GameLeaderboard
        : { topPlayers: [], totalPlayers: 0, totalAnswered: 0, answerCounts: [], lastUpdated: null };

      // Update answer counts for current question (for answer distribution chart)
      const answerCounts = [...(currentLeaderboard.answerCounts || [])];
      if ((questionType === 'single-choice' || questionType === 'poll-single') && data.answerIndex !== undefined && data.answerIndex >= 0) {
        while (answerCounts.length <= data.answerIndex) answerCounts.push(0);
        answerCounts[data.answerIndex]++;
      } else if ((questionType === 'multiple-choice' || questionType === 'poll-multiple') && data.answerIndices) {
        for (const idx of data.answerIndices) {
          while (answerCounts.length <= idx) answerCounts.push(0);
          answerCounts[idx]++;
        }
      }

      // Create entry for this player
      const playerEntry: LeaderboardEntry = {
        id: playerId,
        name: player.name,
        score: newScore,
        currentStreak: newStreak,
        lastQuestionPoints: points,
      };

      // Update top 20 players list
      let topPlayers = [...currentLeaderboard.topPlayers];
      const existingIndex = topPlayers.findIndex(p => p.id === playerId);

      if (existingIndex >= 0) {
        // Update existing entry
        topPlayers[existingIndex] = playerEntry;
      } else if (topPlayers.length < 20 || newScore > (topPlayers[topPlayers.length - 1]?.score || 0)) {
        // Add new entry if room or score is high enough
        topPlayers.push(playerEntry);
      }

      // Sort by score descending and keep top 20
      topPlayers.sort((a, b) => b.score - a.score);
      topPlayers = topPlayers.slice(0, 20);

      // Write updated leaderboard aggregate
      await leaderboardRef.set({
        topPlayers,
        totalPlayers,
        totalAnswered: currentLeaderboard.totalAnswered + 1,
        answerCounts,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Return result to client
      return {
        success: true,
        isCorrect,
        isPartiallyCorrect,
        points,
        newScore,
        currentStreak: newStreak,
        rank,
        totalPlayers,
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
