import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SubmitPollAnswerRequest, SubmitPollAnswerResult, PollPlayerAnswer } from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';
import { enforceRateLimitInMemory } from '../utils/rateLimit';

/**
 * Cloud Function to submit poll answers
 * Separate from submitAnswer to keep quiz answer submission fast
 *
 * Key differences from submitAnswer:
 * - No scoring (polls always return 0 points)
 * - No answer key lookup (polls don't have correct answers)
 * - Simpler validation
 * - No warm instances (polls are less latency-sensitive)
 *
 * Security features (same as submitAnswer):
 * - App Check: Verifies requests come from genuine app instances
 * - CORS validation: Only accepts requests from authorized origins
 * - Rate limiting: Per-player rate limiting prevents abuse (60 requests/minute)
 * - Transaction safety: Uses Firestore transactions to prevent race conditions
 */
export const submitPollAnswer = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 10,
    memory: '256MiB',
    minInstances: 0,  // No warm instances - polls are less latency-sensitive
    maxInstances: 10,
    concurrency: 80,
    enforceAppCheck: true,
  },
  async (request): Promise<SubmitPollAnswerResult> => {
    // Verify App Check token
    verifyAppCheck(request);

    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as SubmitPollAnswerRequest;

    // Validate required fields
    if (!data.gameId || typeof data.gameId !== 'string') {
      throw new HttpsError('invalid-argument', 'gameId is required');
    }
    if (!data.playerId || typeof data.playerId !== 'string') {
      throw new HttpsError('invalid-argument', 'playerId is required');
    }
    if (typeof data.questionIndex !== 'number' || data.questionIndex < 0) {
      throw new HttpsError('invalid-argument', 'Valid questionIndex is required');
    }
    if (!data.questionType || !['poll-single', 'poll-multiple', 'poll-free-text'].includes(data.questionType)) {
      throw new HttpsError('invalid-argument', 'Valid poll questionType is required');
    }

    const { gameId, playerId, questionIndex, questionType } = data;

    // Rate limiting: 60 requests per minute per player
    enforceRateLimitInMemory(`poll:${playerId}`, 60, 60);

    // Validate answer data based on question type
    if (questionType === 'poll-single') {
      if (typeof data.answerIndex !== 'number' || data.answerIndex < 0) {
        throw new HttpsError('invalid-argument', 'answerIndex is required for poll-single');
      }
    } else if (questionType === 'poll-multiple') {
      if (!Array.isArray(data.answerIndices) || data.answerIndices.length === 0) {
        throw new HttpsError('invalid-argument', 'answerIndices is required for poll-multiple');
      }
      // Validate all indices are non-negative numbers
      if (!data.answerIndices.every(idx => typeof idx === 'number' && idx >= 0)) {
        throw new HttpsError('invalid-argument', 'answerIndices must contain valid indices');
      }
    } else if (questionType === 'poll-free-text') {
      if (typeof data.textAnswer !== 'string' || data.textAnswer.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'textAnswer is required for poll-free-text');
      }
      if (data.textAnswer.length > 1000) {
        throw new HttpsError('invalid-argument', 'textAnswer exceeds maximum length of 1000 characters');
      }
    }

    const db = admin.firestore();
    const playerRef = db.collection('games').doc(gameId).collection('players').doc(playerId);

    try {
      // Use transaction to ensure atomic update and prevent duplicate submissions
      await db.runTransaction(async (transaction) => {
        const playerDoc = await transaction.get(playerRef);

        if (!playerDoc.exists) {
          throw new HttpsError('not-found', 'Player not found');
        }

        // Check if player already answered this question
        const playerData = playerDoc.data();
        const answers = playerData?.answers || [];
        const alreadyAnswered = answers.some((a: { questionIndex: number }) => a.questionIndex === questionIndex);
        if (alreadyAnswered) {
          throw new HttpsError('failed-precondition', 'Already answered this question');
        }

        // Create poll answer object
        const answer: PollPlayerAnswer = {
          questionIndex,
          questionType,
          timestamp: admin.firestore.Timestamp.now(),
        };

        // Add type-specific answer data
        if (questionType === 'poll-single') {
          answer.answerIndex = data.answerIndex!;
        } else if (questionType === 'poll-multiple') {
          answer.answerIndices = data.answerIndices!;
        } else if (questionType === 'poll-free-text') {
          answer.textAnswer = data.textAnswer!.trim();
        }

        // Update player document
        transaction.update(playerRef, {
          answers: admin.firestore.FieldValue.arrayUnion(answer)
        });
      });

      // Update totalAnswered counter (for host to see progress)
      const leaderboardRef = db.collection('games').doc(gameId).collection('aggregates').doc('leaderboard');

      // Build update with totalAnswered and liveAnswerCounts for choice-based questions
      const leaderboardUpdate: Record<string, admin.firestore.FieldValue> = {
        totalAnswered: admin.firestore.FieldValue.increment(1),
      };

      // Add live answer counts for choice-based poll questions
      if (questionType === 'poll-single' && data.answerIndex !== undefined) {
        leaderboardUpdate[`liveAnswerCounts.${data.answerIndex}`] = admin.firestore.FieldValue.increment(1);
      } else if (questionType === 'poll-multiple' && data.answerIndices) {
        for (const idx of data.answerIndices) {
          leaderboardUpdate[`liveAnswerCounts.${idx}`] = admin.firestore.FieldValue.increment(1);
        }
      }
      // Note: poll-free-text doesn't have discrete options, no liveAnswerCounts

      await leaderboardRef.set(leaderboardUpdate, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error in submitPollAnswer:', error);

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError('internal', 'An error occurred while submitting your response');
    }
  }
);
