import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  ComputePollAnalyticsRequest,
  ComputePollAnalyticsResult,
  PollAnalytics,
  PollQuestionStats,
  PollAnalyticsSummary,
  Player,
  PlayerAnswer,
} from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';

/**
 * Poll question interface (subset of client types)
 */
interface PollQuestion {
  type: 'poll-single' | 'poll-multiple' | 'poll-free-text';
  text: string;
  answers?: { text: string }[];
}

/**
 * Poll activity interface (subset for analytics)
 */
interface PollActivity {
  title: string;
  questions: PollQuestion[];
}

/**
 * Game interface (subset for analytics)
 */
interface Game {
  activityId: string;
  hostId: string;
  state: string;
  activityType: string;
}

/**
 * Cloud Function to compute analytics for a completed poll.
 * Called on-demand by the host from the analytics page.
 */
export const computePollAnalytics = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request): Promise<ComputePollAnalyticsResult> => {
    const data = request.data as ComputePollAnalyticsRequest;

    if (!data.gameId) {
      throw new HttpsError('invalid-argument', 'gameId is required');
    }

    const { gameId } = data;
    const db = admin.firestore();

    try {
      // 1. Fetch game document
      const gameRef = db.collection('games').doc(gameId);
      const gameDoc = await gameRef.get();

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const game = gameDoc.data() as Game;

      // 2. Verify this is a poll game
      if (game.activityType !== 'poll') {
        throw new HttpsError('failed-precondition', 'This function is only for poll games');
      }

      // 3. Verify caller is the game host
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      if (game.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can generate analytics');
      }

      // 4. Verify game is ended
      if (game.state !== 'ended') {
        throw new HttpsError('failed-precondition', 'Analytics can only be generated for ended polls');
      }

      // 5. Fetch poll activity document
      const activityDoc = await db.collection('activities').doc(game.activityId).get();
      if (!activityDoc.exists) {
        throw new HttpsError('not-found', 'Poll activity not found');
      }
      const poll = activityDoc.data() as PollActivity;

      // 6. Fetch all players
      const playersSnapshot = await db.collection('games').doc(gameId).collection('players').get();
      const players: (Player & { id: string })[] = [];
      playersSnapshot.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() } as Player & { id: string });
      });

      if (players.length === 0) {
        throw new HttpsError('failed-precondition', 'No participants in this poll');
      }

      // 7. Build question stats
      const questionStats = buildPollQuestionStats(poll.questions, players);

      // 8. Compute summary
      const summary = computePollSummary(questionStats, players.length);

      // 9. Build the analytics document
      const analytics: PollAnalytics = {
        gameId,
        activityId: game.activityId,
        pollTitle: poll.title,
        totalQuestions: poll.questions.length,
        totalParticipants: players.length,
        computedAt: admin.firestore.FieldValue.serverTimestamp(),
        questionStats,
        summary,
      };

      // 10. Write to Firestore
      const analyticsRef = db.collection('games').doc(gameId).collection('aggregates').doc('poll-analytics');
      await analyticsRef.set(analytics);

      console.log(`[PollAnalytics] Computed analytics for poll game ${gameId}: ${players.length} participants, ${poll.questions.length} questions`);

      return {
        success: true,
        message: 'Poll analytics computed successfully',
        analytics: {
          totalParticipants: players.length,
          totalQuestions: poll.questions.length,
        },
      };
    } catch (error) {
      console.error('[PollAnalytics] Error computing poll analytics:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'An error occurred while computing poll analytics'
      );
    }
  }
);

/**
 * Build question-level statistics for poll questions
 */
function buildPollQuestionStats(questions: PollQuestion[], players: (Player & { id: string })[]): PollQuestionStats[] {
  return questions.map((question, index) => {
    // Collect answers for this question
    const answers: PlayerAnswer[] = [];
    players.forEach(player => {
      const answer = player.answers?.find(a => a.questionIndex === index);
      if (answer) {
        answers.push(answer);
      }
    });

    const totalResponded = answers.length;
    const responseRate = players.length > 0 ? (totalResponded / players.length) * 100 : 0;

    // Build distribution based on question type
    let answerDistribution: PollQuestionStats['answerDistribution'] | undefined;
    let textGroups: PollQuestionStats['textGroups'] | undefined;

    if (question.type === 'poll-single') {
      const answerCounts = new Map<number, number>();
      answers.forEach(a => {
        if (a.answerIndex !== undefined) {
          answerCounts.set(a.answerIndex, (answerCounts.get(a.answerIndex) || 0) + 1);
        }
      });

      answerDistribution = (question.answers || []).map((ans, i) => {
        const count = answerCounts.get(i) || 0;
        return {
          label: ans.text,
          count,
          percentage: totalResponded > 0 ? (count / totalResponded) * 100 : 0,
        };
      });
    } else if (question.type === 'poll-multiple') {
      const answerCounts = new Map<number, number>();
      answers.forEach(a => {
        (a.answerIndices || []).forEach(idx => {
          answerCounts.set(idx, (answerCounts.get(idx) || 0) + 1);
        });
      });

      answerDistribution = (question.answers || []).map((ans, i) => {
        const count = answerCounts.get(i) || 0;
        return {
          label: ans.text,
          count,
          percentage: totalResponded > 0 ? (count / totalResponded) * 100 : 0,
        };
      });
    } else if (question.type === 'poll-free-text') {
      // Group free text responses
      const textCounts = new Map<string, number>();
      answers.forEach(a => {
        const text = (a.textAnswer || '').trim().toLowerCase();
        if (text) {
          textCounts.set(text, (textCounts.get(text) || 0) + 1);
        }
      });

      textGroups = Array.from(textCounts.entries())
        .map(([text, count]) => ({
          text,
          count,
          percentage: totalResponded > 0 ? (count / totalResponded) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Limit to top 20 responses
    }

    return {
      questionIndex: index,
      questionText: question.text,
      questionType: question.type,
      totalResponded,
      responseRate,
      ...(answerDistribution && { answerDistribution }),
      ...(textGroups && { textGroups }),
    };
  });
}

/**
 * Compute poll summary statistics
 */
function computePollSummary(questionStats: PollQuestionStats[], totalParticipants: number): PollAnalyticsSummary {
  const totalResponses = questionStats.reduce((sum, q) => sum + q.totalResponded, 0);
  const avgResponseRate = questionStats.length > 0
    ? questionStats.reduce((sum, q) => sum + q.responseRate, 0) / questionStats.length
    : 0;

  return {
    avgResponseRate,
    totalResponses,
  };
}
