import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  ComputeGameAnalyticsRequest,
  ComputeGameAnalyticsResult,
  GameAnalytics,
  QuestionStats,
  PositionHistoryEntry,
  ScoreBin,
  LeaderboardWithStats,
  GameAnalyticsSummary,
  CrowdsourceAnalytics,
  Player,
  PlayerAnswer,
} from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';

/**
 * Question interface (subset of client Quiz types)
 */
interface Question {
  type: string;
  text: string;
  imageUrl?: string;
  submittedBy?: string;
  answers?: { text: string; isCorrect?: boolean }[];
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
  correctValue?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  correctAnswer?: string;
  alternativeAnswers?: string[];
  timeLimit?: number;
}

/**
 * Quiz interface (subset for analytics)
 */
interface Quiz {
  title: string;
  questions: Question[];
}

/**
 * Game interface (subset for analytics)
 */
interface Game {
  quizId: string;
  hostId: string;
  state: string;
  questions?: Question[];  // Override questions if crowdsourced
}

/**
 * QuestionSubmission interface
 */
interface QuestionSubmission {
  playerId: string;
  playerName: string;
  questionText: string;
  aiSelected?: boolean;
}

/**
 * Cloud Function to compute comprehensive analytics for a completed game.
 * Called on-demand by the host from the dashboard.
 */
export const computeGameAnalytics = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,  // May need time for large games
    memory: '512MiB',
  },
  async (request): Promise<ComputeGameAnalyticsResult> => {
    const data = request.data as ComputeGameAnalyticsRequest;

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

      // 2. Verify caller is the game host
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      if (game.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can generate analytics');
      }

      // 3. Verify game is ended
      if (game.state !== 'ended') {
        throw new HttpsError('failed-precondition', 'Analytics can only be generated for ended games');
      }

      // 4. Fetch quiz document
      const quizDoc = await db.collection('quizzes').doc(game.quizId).get();
      if (!quizDoc.exists) {
        throw new HttpsError('not-found', 'Quiz not found');
      }
      const quiz = quizDoc.data() as Quiz;

      // Use game.questions if available (crowdsourced), otherwise use quiz.questions
      const questions = game.questions || quiz.questions;

      // 5. Fetch all players
      const playersSnapshot = await db.collection('games').doc(gameId).collection('players').get();
      const players: (Player & { id: string })[] = [];
      playersSnapshot.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() } as Player & { id: string });
      });

      if (players.length === 0) {
        throw new HttpsError('failed-precondition', 'No players participated in this game');
      }

      // 6. Fetch submissions for crowdsource analytics
      const submissionsSnapshot = await db.collection('games').doc(gameId).collection('submissions').get();
      const submissions: QuestionSubmission[] = [];
      submissionsSnapshot.forEach(doc => {
        submissions.push(doc.data() as QuestionSubmission);
      });

      // 7. Build question stats
      const questionStats = buildQuestionStats(questions, players);

      // 8. Build position history (top 20 players)
      const positionHistory = buildPositionHistory(questions, players);

      // 9. Build score distribution
      const scoreDistribution = buildScoreDistribution(players);

      // 10. Build full leaderboard with stats
      const fullLeaderboard = buildFullLeaderboard(players, questions);

      // 11. Compute summary
      const summary = computeSummary(questionStats, fullLeaderboard);

      // 12. Build crowdsource stats if applicable
      const crowdsourceStats = submissions.length > 0
        ? buildCrowdsourceStats(submissions)
        : undefined;

      // 13. Build the analytics document
      const analytics: GameAnalytics = {
        gameId,
        quizId: game.quizId,
        quizTitle: quiz.title,
        totalQuestions: questions.length,
        totalPlayers: players.length,
        computedAt: admin.firestore.FieldValue.serverTimestamp(),
        questionStats,
        positionHistory,
        scoreDistribution,
        fullLeaderboard,
        summary,
        ...(crowdsourceStats && { crowdsourceStats }),
      };

      // 14. Write to Firestore
      const analyticsRef = db.collection('games').doc(gameId).collection('aggregates').doc('analytics');
      await analyticsRef.set(analytics);

      console.log(`[Analytics] Computed analytics for game ${gameId}: ${players.length} players, ${questions.length} questions`);

      return {
        success: true,
        message: 'Analytics computed successfully',
        analytics: {
          totalPlayers: players.length,
          totalQuestions: questions.length,
        },
      };
    } catch (error) {
      console.error('[Analytics] Error computing game analytics:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'An error occurred while computing analytics'
      );
    }
  }
);

/**
 * Build question-level statistics
 */
function buildQuestionStats(questions: Question[], players: (Player & { id: string })[]): QuestionStats[] {
  return questions.map((question, index) => {
    // Skip slide questions entirely
    if (question.type === 'slide') {
      return {
        questionIndex: index,
        questionText: question.text,
        questionType: question.type,
        ...(question.imageUrl && { imageUrl: question.imageUrl }),
        ...(question.submittedBy && { submittedBy: question.submittedBy }),
        totalAnswered: 0,
        totalTimeout: 0,
        timeoutRate: 0,
        correctCount: 0,
        correctRate: 0,
        avgResponseTime: 0,
        avgPoints: 0,
      };
    }

    // Collect answers for this question
    const answers: PlayerAnswer[] = [];
    players.forEach(player => {
      const answer = player.answers?.find(a => a.questionIndex === index);
      if (answer) {
        answers.push(answer);
      }
    });

    const totalAnswered = answers.filter(a => !a.wasTimeout).length;
    const totalTimeout = answers.filter(a => a.wasTimeout).length;
    const timeoutRate = players.length > 0
      ? ((players.length - totalAnswered) / players.length) * 100
      : 0;

    // For scored questions, compute correct rate
    const isScored = !['poll-single', 'poll-multiple'].includes(question.type);
    const correctCount = isScored ? answers.filter(a => a.isCorrect).length : 0;
    const correctRate = isScored && totalAnswered > 0
      ? (correctCount / totalAnswered) * 100
      : 0;

    // Note: avgResponseTime would require storing response time in PlayerAnswer
    // For now, we set it to 0 as this data isn't available
    const avgResponseTime = 0;

    // Compute average points
    const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);
    const avgPoints = totalAnswered > 0 ? totalPoints / totalAnswered : 0;

    // Build answer distribution based on question type
    let answerDistribution: { label: string; count: number; isCorrect: boolean }[] | undefined;
    let sliderDistribution: QuestionStats['sliderDistribution'] | undefined;
    let freeResponseDistribution: { text: string; count: number; isCorrect: boolean }[] | undefined;

    if (question.type === 'single-choice' || question.type === 'poll-single') {
      const answerCounts = new Map<number, number>();
      answers.forEach(a => {
        if (a.answerIndex !== undefined) {
          answerCounts.set(a.answerIndex, (answerCounts.get(a.answerIndex) || 0) + 1);
        }
      });

      answerDistribution = (question.answers || []).map((ans, i) => ({
        label: ans.text,
        count: answerCounts.get(i) || 0,
        isCorrect: question.type === 'single-choice' && question.correctAnswerIndex === i,
      }));
    } else if (question.type === 'multiple-choice' || question.type === 'poll-multiple') {
      const answerCounts = new Map<number, number>();
      answers.forEach(a => {
        (a.answerIndices || []).forEach(idx => {
          answerCounts.set(idx, (answerCounts.get(idx) || 0) + 1);
        });
      });

      const correctIndices = new Set(question.correctAnswerIndices || []);
      answerDistribution = (question.answers || []).map((ans, i) => ({
        label: ans.text,
        count: answerCounts.get(i) || 0,
        isCorrect: question.type === 'multiple-choice' && correctIndices.has(i),
      }));
    } else if (question.type === 'slider') {
      const playerValues = answers
        .filter(a => a.sliderValue !== undefined)
        .map(a => a.sliderValue as number);

      sliderDistribution = {
        correctValue: question.correctValue || 0,
        minValue: question.minValue || 0,
        maxValue: question.maxValue || 100,
        ...(question.unit && { unit: question.unit }),
        playerValues,
      };
    } else if (question.type === 'free-response') {
      const textCounts = new Map<string, { count: number; isCorrect: boolean }>();
      const correctAnswer = (question.correctAnswer || '').toLowerCase().trim();
      const alternatives = (question.alternativeAnswers || []).map(a => a.toLowerCase().trim());

      answers.forEach(a => {
        const text = (a.textAnswer || '').trim();
        const lowerText = text.toLowerCase();
        const isCorrect = lowerText === correctAnswer || alternatives.includes(lowerText);

        if (!textCounts.has(text)) {
          textCounts.set(text, { count: 0, isCorrect });
        }
        textCounts.get(text)!.count++;
      });

      freeResponseDistribution = Array.from(textCounts.entries())
        .map(([text, data]) => ({
          text,
          count: data.count,
          isCorrect: data.isCorrect,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);  // Limit to top 20 responses
    }

    return {
      questionIndex: index,
      questionText: question.text,
      questionType: question.type,
      ...(question.imageUrl && { imageUrl: question.imageUrl }),
      ...(question.submittedBy && { submittedBy: question.submittedBy }),
      ...(answerDistribution && { answerDistribution }),
      ...(sliderDistribution && { sliderDistribution }),
      ...(freeResponseDistribution && { freeResponseDistribution }),
      totalAnswered,
      totalTimeout,
      timeoutRate,
      correctCount,
      correctRate,
      avgResponseTime,
      avgPoints,
    };
  });
}

/**
 * Build position history for players who were ever in top 20
 * This captures both "climbers" (started low, ended high) and
 * "fallers" (started high, ended low)
 */
function buildPositionHistory(
  questions: Question[],
  players: (Player & { id: string })[]
): PositionHistoryEntry[] {
  // Track who was ever in top 20 and all player positions
  const everInTop20 = new Set<string>();
  const playerPositions = new Map<string, number[]>();

  // Initialize position arrays for all players
  players.forEach(p => playerPositions.set(p.id, []));

  // For each question, calculate cumulative scores and ranks
  for (let qIndex = 0; qIndex < questions.length; qIndex++) {
    const cumulativeScores = players.map(p => {
      const answersUpToNow = (p.answers || []).filter(a => a.questionIndex <= qIndex);
      const scoreUpToNow = answersUpToNow.reduce((sum, a) => sum + a.points, 0);
      return { playerId: p.id, score: scoreUpToNow };
    });

    // Sort by score descending
    cumulativeScores.sort((a, b) => b.score - a.score);

    // Assign ranks and track top 20
    cumulativeScores.forEach((entry, idx) => {
      const rank = idx + 1;
      playerPositions.get(entry.playerId)!.push(rank);
      if (rank <= 20) {
        everInTop20.add(entry.playerId);
      }
    });
  }

  // Build results for players who were ever in top 20
  // Sort by final score for consistent ordering
  const trackedPlayers = players
    .filter(p => everInTop20.has(p.id))
    .sort((a, b) => b.score - a.score);

  return trackedPlayers.map(player => ({
    playerId: player.id,
    playerName: player.name,
    positions: playerPositions.get(player.id)!,
    finalScore: player.score,
  }));
}

/**
 * Build score distribution histogram
 */
function buildScoreDistribution(players: (Player & { id: string })[]): ScoreBin[] {
  const scores = players.map(p => p.score);
  const maxScore = Math.max(...scores, 0);
  const minScore = Math.min(...scores, 0);
  const range = maxScore - minScore;

  if (range === 0) {
    return [{
      minScore: minScore,
      maxScore: maxScore,
      count: players.length,
    }];
  }

  // Aim for ~10-12 bins
  const targetBins = 10;
  let binSize = Math.ceil(range / targetBins);

  // Round to nearest 100 for cleaner bins
  if (binSize > 100) {
    binSize = Math.ceil(binSize / 100) * 100;
  } else if (binSize > 10) {
    binSize = Math.ceil(binSize / 10) * 10;
  }

  const bins: ScoreBin[] = [];
  const startScore = Math.floor(minScore / binSize) * binSize;

  for (let binStart = startScore; binStart <= maxScore; binStart += binSize) {
    const binEnd = binStart + binSize;
    const count = scores.filter(s => s >= binStart && s < binEnd).length;

    // Only add non-empty bins, but always include the last bin
    if (count > 0 || binStart + binSize > maxScore) {
      bins.push({
        minScore: binStart,
        maxScore: binEnd - 1,
        count,
      });
    }
  }

  return bins;
}

/**
 * Build full leaderboard with detailed stats
 */
function buildFullLeaderboard(
  players: (Player & { id: string })[],
  _questions: Question[]
): LeaderboardWithStats[] {
  // Sort by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Scored question types (exclude slides, polls)
  const scoredQuestionTypes = new Set(['single-choice', 'multiple-choice', 'slider', 'free-response']);

  return sortedPlayers.map((player, index) => {
    const answers = player.answers || [];

    // Count correct answers (only for scored questions)
    const correctAnswers = answers.filter(a =>
      a.isCorrect && scoredQuestionTypes.has(a.questionType)
    ).length;

    // Count total answered (excluding timeouts)
    const totalAnswered = answers.filter(a => !a.wasTimeout).length;

    // Count timeouts
    const timeouts = answers.filter(a => a.wasTimeout).length;

    // Calculate accuracy (correct / total answered on scored questions)
    const scoredAnswers = answers.filter(a => scoredQuestionTypes.has(a.questionType));
    const accuracy = scoredAnswers.length > 0
      ? (correctAnswers / scoredAnswers.length) * 100
      : 0;

    // Average response time (placeholder - would need timestamp data)
    const avgResponseTime = 0;

    return {
      playerId: player.id,
      playerName: player.name,
      rank: index + 1,
      finalScore: player.score,
      correctAnswers,
      totalAnswered,
      timeouts,
      accuracy,
      avgResponseTime,
    };
  });
}

/**
 * Compute summary statistics
 */
function computeSummary(
  questionStats: QuestionStats[],
  leaderboard: LeaderboardWithStats[]
): GameAnalyticsSummary {
  // Filter to only scored questions with answers
  const scoredStats = questionStats.filter(q =>
    !['slide', 'poll-single', 'poll-multiple'].includes(q.questionType) &&
    q.totalAnswered > 0
  );

  // Find hardest and easiest questions
  let hardestQuestion: { index: number; correctRate: number } | null = null;
  let easiestQuestion: { index: number; correctRate: number } | null = null;

  if (scoredStats.length > 0) {
    const sorted = [...scoredStats].sort((a, b) => a.correctRate - b.correctRate);
    hardestQuestion = {
      index: sorted[0].questionIndex,
      correctRate: sorted[0].correctRate,
    };
    easiestQuestion = {
      index: sorted[sorted.length - 1].questionIndex,
      correctRate: sorted[sorted.length - 1].correctRate,
    };
  }

  // Calculate averages from leaderboard
  const avgScore = leaderboard.length > 0
    ? leaderboard.reduce((sum, p) => sum + p.finalScore, 0) / leaderboard.length
    : 0;

  const avgAccuracy = leaderboard.length > 0
    ? leaderboard.reduce((sum, p) => sum + p.accuracy, 0) / leaderboard.length
    : 0;

  // Calculate average timeout rate
  const avgTimeoutRate = questionStats.length > 0
    ? questionStats.reduce((sum, q) => sum + q.timeoutRate, 0) / questionStats.length
    : 0;

  return {
    hardestQuestion,
    easiestQuestion,
    avgScore,
    avgAccuracy,
    avgTimeoutRate,
  };
}

/**
 * Build crowdsource analytics
 */
function buildCrowdsourceStats(submissions: QuestionSubmission[]): CrowdsourceAnalytics {
  const totalSubmissions = submissions.length;
  const submissionsUsed = submissions.filter(s => s.aiSelected).length;

  // Count submissions and used per player
  const playerStats = new Map<string, { submissionCount: number; usedCount: number }>();

  submissions.forEach(s => {
    if (!playerStats.has(s.playerName)) {
      playerStats.set(s.playerName, { submissionCount: 0, usedCount: 0 });
    }
    const stats = playerStats.get(s.playerName)!;
    stats.submissionCount++;
    if (s.aiSelected) {
      stats.usedCount++;
    }
  });

  // Get top contributors (sorted by used count, then submission count)
  const topContributors = Array.from(playerStats.entries())
    .map(([playerName, stats]) => ({
      playerName,
      submissionCount: stats.submissionCount,
      usedCount: stats.usedCount,
    }))
    .sort((a, b) => {
      if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
      return b.submissionCount - a.submissionCount;
    })
    .slice(0, 10);  // Top 10 contributors

  return {
    totalSubmissions,
    submissionsUsed,
    topContributors,
  };
}
