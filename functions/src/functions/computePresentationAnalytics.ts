import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';

interface ComputeAnalyticsRequest {
  gameId: string;
}

/**
 * Cloud Function to compute post-game analytics for a presentation.
 * Called when a presentation ends.
 */
export const computePresentationAnalytics = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { gameId } = request.data as ComputeAnalyticsRequest;
    if (!gameId) {
      throw new HttpsError('invalid-argument', 'gameId is required');
    }

    const db = admin.firestore();

    // Verify game exists and user is host
    const gameDoc = await db.doc(`games/${gameId}`).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data()!;
    if (gameData.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the host can compute analytics');
    }

    // Load presentation for slide/element metadata
    const presDoc = await db.doc(`presentations/${gameData.presentationId}`).get();
    if (!presDoc.exists) {
      throw new HttpsError('not-found', 'Presentation not found');
    }

    const presData = presDoc.data()!;
    const slides = presData.slides || [];

    // Load players
    const playersSnap = await db.collection(`games/${gameId}/players`).get();
    const totalPlayers = playersSnap.size;

    // Load all responses
    const responsesSnap = await db.collection(`games/${gameId}/responses`).get();
    const responses = responsesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Load reactions count
    const reactionsSnap = await db.collection(`games/${gameId}/reactions`).count().get();
    const totalReactions = reactionsSnap.data().count;

    // Load Q&A questions count
    const questionsSnap = await db.collection(`games/${gameId}/questions`).count().get();
    const totalQuestions = questionsSnap.data().count;

    // Build per-element analytics
    const elementStats: Array<{
      elementId: string;
      slideIndex: number;
      elementType: string;
      totalResponses: number;
      responseRate: number;
      correctCount?: number;
      correctRate?: number;
      avgRating?: number;
      answerDistribution?: Record<string, number>;
    }> = [];

    for (let si = 0; si < slides.length; si++) {
      const slide = slides[si];
      for (const element of slide.elements || []) {
        if (!['quiz', 'poll', 'thoughts', 'rating'].includes(element.type)) continue;

        const elementResponses = responses.filter(
          (r: Record<string, unknown>) => r.elementId === element.id
        );
        const totalResponses = elementResponses.length;
        const responseRate = totalPlayers > 0 ? (totalResponses / totalPlayers) * 100 : 0;

        const stat: (typeof elementStats)[0] = {
          elementId: element.id,
          slideIndex: si,
          elementType: element.type,
          totalResponses,
          responseRate: Math.round(responseRate * 10) / 10,
        };

        if (element.type === 'quiz' && element.quizConfig) {
          const correctCount = elementResponses.filter(
            (r: Record<string, unknown>) => r.answerIndex === element.quizConfig.correctAnswerIndex
          ).length;
          stat.correctCount = correctCount;
          stat.correctRate = totalResponses > 0
            ? Math.round((correctCount / totalResponses) * 1000) / 10
            : 0;

          // Answer distribution
          const dist: Record<string, number> = {};
          for (const r of elementResponses) {
            const key = String((r as Record<string, unknown>).answerIndex);
            dist[key] = (dist[key] || 0) + 1;
          }
          stat.answerDistribution = dist;
        }

        if (element.type === 'rating') {
          const ratings = elementResponses
            .map((r: Record<string, unknown>) => r.ratingValue as number)
            .filter((v): v is number => typeof v === 'number');
          if (ratings.length > 0) {
            stat.avgRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
          }
        }

        elementStats.push(stat);
      }
    }

    // Player engagement
    const playerEngagement = playersSnap.docs.map((d) => {
      const data = d.data();
      const playerResponses = responses.filter(
        (r: Record<string, unknown>) => r.playerId === d.id
      );
      const interactiveElements = elementStats.length;
      const responseRate = interactiveElements > 0
        ? (playerResponses.length / interactiveElements) * 100
        : 0;

      return {
        playerId: d.id,
        playerName: data.name,
        score: data.score || 0,
        streak: data.maxStreak || 0,
        responsesSubmitted: playerResponses.length,
        responseRate: Math.round(responseRate * 10) / 10,
      };
    });

    // Summary
    const avgResponseRate = elementStats.length > 0
      ? elementStats.reduce((sum, s) => sum + s.responseRate, 0) / elementStats.length
      : 0;

    const analytics = {
      gameId,
      presentationId: gameData.presentationId,
      presentationTitle: presData.title,
      totalSlides: slides.length,
      totalPlayers,
      totalReactions,
      totalQuestions,
      elementStats,
      playerEngagement: playerEngagement.sort((a, b) => b.score - a.score),
      summary: {
        avgResponseRate: Math.round(avgResponseRate * 10) / 10,
        interactiveElements: elementStats.length,
      },
      computedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save analytics
    await db.doc(`games/${gameId}/aggregates/analytics`).set(analytics);

    return {
      success: true,
      totalPlayers,
      interactiveElements: elementStats.length,
    };
  }
);
