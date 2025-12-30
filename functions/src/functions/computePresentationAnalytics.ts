import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  ComputePresentationAnalyticsRequest,
  ComputePresentationAnalyticsResult,
  PresentationAnalytics,
  PresentationSlideStats,
  PresentationSlideType,
  PlayerEngagementStats,
  PresentationAnalyticsSummary,
  SlideTypeStats,
  Player,
} from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';

/**
 * Slide interface (subset of client PresentationSlide)
 */
interface PresentationSlide {
  id: string;
  type: PresentationSlideType;
  order: number;
  title?: string;
  description?: string;
  thoughtsPrompt?: string;
  question?: {
    type: string;
    text: string;
    answers?: { text: string; isCorrect?: boolean }[];
    correctAnswerIndex?: number;
    correctAnswerIndices?: number[];
  };
  ratingItem?: {
    title: string;
  };
  ratingMetric?: {
    min: number;
    max: number;
  };
}

/**
 * Presentation interface (subset for analytics)
 */
interface Presentation {
  title: string;
  slides: PresentationSlide[];
}

/**
 * Game interface (subset for presentation analytics)
 */
interface PresentationGame {
  presentationId: string;
  hostId: string;
  state: string;
  activityType: string;
}

/**
 * Slide response stored in slideResponses collection
 */
interface SlideResponse {
  slideId: string;
  playerId: string;
  playerName: string;
  slideType?: string;
  answerIndex?: number;
  answerIndices?: number[];
  rating?: number;
  isCorrect?: boolean;
  points?: number;
}

/**
 * Submission stored in submissions collection (for thoughts-collect)
 */
interface ThoughtsSubmission {
  slideId?: string;
  playerId: string;
  playerName: string;
  rawText?: string;
}

// Interactive slide types that collect responses
const INTERACTIVE_SLIDE_TYPES: PresentationSlideType[] = [
  'quiz',
  'poll',
  'thoughts-collect',
  'rating-input',
];

// Human-readable labels for slide types
const SLIDE_TYPE_LABELS: Record<PresentationSlideType, string> = {
  'content': 'Content',
  'quiz': 'Quiz',
  'poll': 'Poll',
  'quiz-results': 'Quiz Results',
  'poll-results': 'Poll Results',
  'thoughts-collect': 'Thoughts Collection',
  'thoughts-results': 'Thoughts Results',
  'rating-describe': 'Rating Description',
  'rating-input': 'Rating Input',
  'rating-results': 'Rating Results',
  'rating-summary': 'Rating Summary',
  'leaderboard': 'Leaderboard',
};

/**
 * Cloud Function to compute analytics for a completed presentation.
 * Called on-demand by the host from the analytics page.
 */
export const computePresentationAnalytics = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request): Promise<ComputePresentationAnalyticsResult> => {
    const data = request.data as ComputePresentationAnalyticsRequest;

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

      const game = gameDoc.data() as PresentationGame;

      // 2. Verify this is a presentation game
      if (game.activityType !== 'presentation') {
        throw new HttpsError('failed-precondition', 'This function is only for presentation games');
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
        throw new HttpsError('failed-precondition', 'Analytics can only be generated for ended presentations');
      }

      // 5. Fetch presentation document
      const presentationDoc = await db.collection('presentations').doc(game.presentationId).get();
      if (!presentationDoc.exists) {
        throw new HttpsError('not-found', 'Presentation not found');
      }
      const presentation = presentationDoc.data() as Presentation;

      // 6. Fetch all players
      const playersSnapshot = await db.collection('games').doc(gameId).collection('players').get();
      const players: (Player & { id: string })[] = [];
      playersSnapshot.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() } as Player & { id: string });
      });

      if (players.length === 0) {
        throw new HttpsError('failed-precondition', 'No participants in this presentation');
      }

      // 7. Fetch all slide responses
      const slideResponsesSnapshot = await db.collection('games').doc(gameId).collection('slideResponses').get();
      const slideResponses: SlideResponse[] = [];
      slideResponsesSnapshot.forEach(doc => {
        slideResponses.push(doc.data() as SlideResponse);
      });

      // 8. Fetch all thoughts submissions
      const submissionsSnapshot = await db.collection('games').doc(gameId).collection('submissions').get();
      const submissions: ThoughtsSubmission[] = [];
      submissionsSnapshot.forEach(doc => {
        submissions.push(doc.data() as ThoughtsSubmission);
      });

      // 9. Fetch topic aggregates for thoughts slides
      const topicAggregates = new Map<string, { topics: any[]; processedAt: any }>();
      for (const slide of presentation.slides) {
        if (slide.type === 'thoughts-collect') {
          const topicsDoc = await db.collection('games').doc(gameId).collection('aggregates').doc(`topics-${slide.id}`).get();
          if (topicsDoc.exists) {
            topicAggregates.set(slide.id, topicsDoc.data() as any);
          }
        }
      }

      // 10. Get list of interactive slides
      const interactiveSlides = presentation.slides.filter(s =>
        INTERACTIVE_SLIDE_TYPES.includes(s.type)
      );

      // 11. Build slide stats
      const slideStats = buildSlideStats(
        presentation.slides,
        slideResponses,
        submissions,
        topicAggregates,
        players.length
      );

      // 12. Build player engagement stats
      const playerEngagement = buildPlayerEngagement(
        players,
        interactiveSlides,
        slideResponses,
        submissions
      );

      // 13. Build slide type breakdown
      const slideTypeBreakdown = buildSlideTypeBreakdown(slideStats);

      // 14. Compute summary
      const summary = computeSummary(slideStats, playerEngagement, interactiveSlides.length);

      // 15. Build the analytics document
      const analytics: PresentationAnalytics = {
        gameId,
        presentationId: game.presentationId,
        presentationTitle: presentation.title,
        totalSlides: presentation.slides.length,
        interactiveSlides: interactiveSlides.length,
        totalPlayers: players.length,
        computedAt: admin.firestore.FieldValue.serverTimestamp(),
        slideStats,
        playerEngagement,
        summary,
        slideTypeBreakdown,
      };

      // 16. Write to Firestore
      const analyticsRef = db.collection('games').doc(gameId).collection('aggregates').doc('analytics');
      await analyticsRef.set(analytics);

      console.log(`[PresentationAnalytics] Computed analytics for presentation game ${gameId}: ${players.length} players, ${presentation.slides.length} slides`);

      return {
        success: true,
        message: 'Presentation analytics computed successfully',
        analytics: {
          totalPlayers: players.length,
          totalSlides: presentation.slides.length,
          interactiveSlides: interactiveSlides.length,
        },
      };
    } catch (error) {
      console.error('[PresentationAnalytics] Error computing presentation analytics:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'An error occurred while computing presentation analytics'
      );
    }
  }
);

/**
 * Build statistics for each slide
 */
function buildSlideStats(
  slides: PresentationSlide[],
  slideResponses: SlideResponse[],
  submissions: ThoughtsSubmission[],
  topicAggregates: Map<string, { topics: any[] }>,
  totalPlayers: number
): PresentationSlideStats[] {
  return slides.map((slide, index) => {
    // Get responses for this slide
    const responses = slideResponses.filter(r => r.slideId === slide.id);
    const slideSubmissions = submissions.filter(s => s.slideId === slide.id);

    // Get unique responders (for thoughts, group by player)
    let totalResponded = 0;
    if (slide.type === 'thoughts-collect') {
      const uniquePlayers = new Set(slideSubmissions.map(s => s.playerId));
      totalResponded = uniquePlayers.size;
    } else if (INTERACTIVE_SLIDE_TYPES.includes(slide.type)) {
      totalResponded = responses.length;
    }

    const responseRate = totalPlayers > 0 ? (totalResponded / totalPlayers) * 100 : 0;

    // Base stats
    const baseStats: PresentationSlideStats = {
      slideIndex: index,
      slideId: slide.id,
      slideType: slide.type,
      title: slide.title || slide.question?.text || slide.thoughtsPrompt || slide.ratingItem?.title,
      totalResponded,
      responseRate,
    };

    // Type-specific stats
    if (slide.type === 'quiz' && slide.question) {
      return buildQuizSlideStats(baseStats, slide, responses);
    } else if (slide.type === 'poll' && slide.question) {
      return buildPollSlideStats(baseStats, slide, responses);
    } else if (slide.type === 'rating-input') {
      return buildRatingSlideStats(baseStats, slide, responses);
    } else if (slide.type === 'thoughts-collect') {
      return buildThoughtsSlideStats(baseStats, slide, slideSubmissions, topicAggregates);
    }

    return baseStats;
  });
}

/**
 * Build quiz slide statistics
 */
function buildQuizSlideStats(
  baseStats: PresentationSlideStats,
  slide: PresentationSlide,
  responses: SlideResponse[]
): PresentationSlideStats {
  const question = slide.question!;
  const correctResponses = responses.filter(r => r.isCorrect);
  const totalAnswered = responses.length;

  // Build answer distribution
  const answerCounts = new Map<number, number>();
  responses.forEach(r => {
    if (r.answerIndex !== undefined) {
      answerCounts.set(r.answerIndex, (answerCounts.get(r.answerIndex) || 0) + 1);
    }
    // Handle multiple choice
    if (r.answerIndices) {
      r.answerIndices.forEach(idx => {
        answerCounts.set(idx, (answerCounts.get(idx) || 0) + 1);
      });
    }
  });

  const correctIndices = new Set(question.correctAnswerIndices || [question.correctAnswerIndex]);
  const answerDistribution = (question.answers || []).map((ans, i) => ({
    label: ans.text,
    count: answerCounts.get(i) || 0,
    isCorrect: correctIndices.has(i),
  }));

  // Calculate average points
  const totalPoints = responses.reduce((sum, r) => sum + (r.points || 0), 0);
  const avgPoints = totalAnswered > 0 ? totalPoints / totalAnswered : 0;

  return {
    ...baseStats,
    correctCount: correctResponses.length,
    correctRate: totalAnswered > 0 ? (correctResponses.length / totalAnswered) * 100 : 0,
    avgPoints,
    answerDistribution,
  };
}

/**
 * Build poll slide statistics
 */
function buildPollSlideStats(
  baseStats: PresentationSlideStats,
  slide: PresentationSlide,
  responses: SlideResponse[]
): PresentationSlideStats {
  const question = slide.question!;
  const totalResponded = responses.length;

  // Build answer distribution
  const answerCounts = new Map<number, number>();
  responses.forEach(r => {
    if (r.answerIndex !== undefined) {
      answerCounts.set(r.answerIndex, (answerCounts.get(r.answerIndex) || 0) + 1);
    }
    if (r.answerIndices) {
      r.answerIndices.forEach(idx => {
        answerCounts.set(idx, (answerCounts.get(idx) || 0) + 1);
      });
    }
  });

  const pollDistribution = (question.answers || []).map((ans, i) => ({
    label: ans.text,
    count: answerCounts.get(i) || 0,
    percentage: totalResponded > 0 ? ((answerCounts.get(i) || 0) / totalResponded) * 100 : 0,
  }));

  return {
    ...baseStats,
    pollDistribution,
  };
}

/**
 * Build rating slide statistics
 */
function buildRatingSlideStats(
  baseStats: PresentationSlideStats,
  slide: PresentationSlide,
  responses: SlideResponse[]
): PresentationSlideStats {
  const ratings = responses.map(r => r.rating).filter((r): r is number => r !== undefined);

  if (ratings.length === 0) {
    return baseStats;
  }

  const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  // Build distribution (assuming 1-5 scale by default)
  const min = slide.ratingMetric?.min ?? 1;
  const max = slide.ratingMetric?.max ?? 5;
  const distributionSize = max - min + 1;
  const ratingDistribution = new Array(distributionSize).fill(0);

  ratings.forEach(rating => {
    const index = Math.round(rating) - min;
    if (index >= 0 && index < distributionSize) {
      ratingDistribution[index]++;
    }
  });

  return {
    ...baseStats,
    avgRating,
    ratingDistribution,
  };
}

/**
 * Build thoughts slide statistics
 */
function buildThoughtsSlideStats(
  baseStats: PresentationSlideStats,
  slide: PresentationSlide,
  submissions: ThoughtsSubmission[],
  topicAggregates: Map<string, { topics: any[] }>
): PresentationSlideStats {
  const topicData = topicAggregates.get(slide.id);

  return {
    ...baseStats,
    submissionCount: submissions.length,
    topicsCount: topicData?.topics?.length || 0,
  };
}

/**
 * Build player engagement statistics
 */
function buildPlayerEngagement(
  players: (Player & { id: string })[],
  interactiveSlides: PresentationSlide[],
  slideResponses: SlideResponse[],
  submissions: ThoughtsSubmission[]
): PlayerEngagementStats[] {
  const interactiveSlideIds = new Set(interactiveSlides.map(s => s.id));
  const thoughtsSlideIds = new Set(
    interactiveSlides.filter(s => s.type === 'thoughts-collect').map(s => s.id)
  );

  return players.map(player => {
    // Count responses to interactive slides
    const playerResponses = slideResponses.filter(
      r => r.playerId === player.id && interactiveSlideIds.has(r.slideId)
    );

    // Count thoughts submissions (unique slides)
    const playerThoughtsSlides = new Set(
      submissions
        .filter(s => s.playerId === player.id && s.slideId && thoughtsSlideIds.has(s.slideId))
        .map(s => s.slideId)
    );

    // Total responses = slide responses + thoughts slides participated
    const responsesSubmitted = playerResponses.length + playerThoughtsSlides.size;
    const totalInteractiveSlides = interactiveSlides.length;
    const responseRate = totalInteractiveSlides > 0
      ? (responsesSubmitted / totalInteractiveSlides) * 100
      : 0;

    // Engagement score (0-100)
    const engagementScore = Math.min(100, responseRate);

    // Score from quiz slides
    const totalScore = player.score || 0;
    const correctAnswers = playerResponses.filter(r => r.isCorrect).length;

    return {
      playerId: player.id,
      playerName: player.name,
      engagementScore,
      responsesSubmitted,
      totalInteractiveSlides,
      responseRate,
      totalScore,
      correctAnswers,
    };
  }).sort((a, b) => b.engagementScore - a.engagementScore);
}

/**
 * Build slide type breakdown statistics
 */
function buildSlideTypeBreakdown(slideStats: PresentationSlideStats[]): SlideTypeStats[] {
  const typeMap = new Map<PresentationSlideType, { count: number; totalResponseRate: number }>();

  // Only include interactive slide types
  slideStats
    .filter(s => INTERACTIVE_SLIDE_TYPES.includes(s.slideType))
    .forEach(stat => {
      const existing = typeMap.get(stat.slideType) || { count: 0, totalResponseRate: 0 };
      typeMap.set(stat.slideType, {
        count: existing.count + 1,
        totalResponseRate: existing.totalResponseRate + stat.responseRate,
      });
    });

  return Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    avgResponseRate: data.count > 0 ? data.totalResponseRate / data.count : 0,
    label: SLIDE_TYPE_LABELS[type],
  }));
}

/**
 * Compute presentation summary statistics
 */
function computeSummary(
  slideStats: PresentationSlideStats[],
  playerEngagement: PlayerEngagementStats[],
  interactiveSlideCount: number
): PresentationAnalyticsSummary {
  // Only consider interactive slides for engagement metrics
  const interactiveStats = slideStats.filter(s =>
    INTERACTIVE_SLIDE_TYPES.includes(s.slideType)
  );

  // Average response rate
  const avgResponseRate = interactiveStats.length > 0
    ? interactiveStats.reduce((sum, s) => sum + s.responseRate, 0) / interactiveStats.length
    : 0;

  // Average engagement score
  const avgEngagementScore = playerEngagement.length > 0
    ? playerEngagement.reduce((sum, p) => sum + p.engagementScore, 0) / playerEngagement.length
    : 0;

  // Most and least engaged slides
  const sortedByResponse = [...interactiveStats].sort((a, b) => b.responseRate - a.responseRate);
  const mostEngagedSlide = sortedByResponse.length > 0
    ? { index: sortedByResponse[0].slideIndex, responseRate: sortedByResponse[0].responseRate }
    : null;
  const leastEngagedSlide = sortedByResponse.length > 1
    ? { index: sortedByResponse[sortedByResponse.length - 1].slideIndex, responseRate: sortedByResponse[sortedByResponse.length - 1].responseRate }
    : null;

  // Quiz accuracy (if quiz slides exist)
  const quizStats = slideStats.filter(s => s.slideType === 'quiz' && s.correctRate !== undefined);
  const avgQuizAccuracy = quizStats.length > 0
    ? quizStats.reduce((sum, s) => sum + (s.correctRate || 0), 0) / quizStats.length
    : undefined;

  // Average rating (if rating slides exist)
  const ratingStats = slideStats.filter(s => s.slideType === 'rating-input' && s.avgRating !== undefined);
  const avgRating = ratingStats.length > 0
    ? ratingStats.reduce((sum, s) => sum + (s.avgRating || 0), 0) / ratingStats.length
    : undefined;

  return {
    avgResponseRate,
    avgEngagementScore,
    mostEngagedSlide,
    leastEngagedSlide,
    avgQuizAccuracy,
    avgRating,
  };
}
