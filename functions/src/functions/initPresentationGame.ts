import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';

interface InitPresentationGameRequest {
  gameId: string;
  presentationId: string;
}

/**
 * Cloud Function to initialize a presentation game.
 * - Builds answer key from interactive quiz elements (for server-side scoring)
 * - Initializes leaderboard aggregate document
 */
export const initPresentationGame = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
    memory: '256MiB',
    enforceAppCheck: true,
  },
  async (request) => {
    verifyAppCheck(request);

    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to initialize a game');
    }

    const { gameId, presentationId } = request.data as InitPresentationGameRequest;

    if (!gameId || !presentationId) {
      throw new HttpsError('invalid-argument', 'gameId and presentationId are required');
    }

    const db = admin.firestore();

    // Verify game exists and user is the host
    const gameDoc = await db.doc(`games/${gameId}`).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data()!;
    if (gameData.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the host can initialize the game');
    }

    // Load the presentation to extract answer keys from quiz elements
    const presDoc = await db.doc(`presentations/${presentationId}`).get();
    if (!presDoc.exists) {
      throw new HttpsError('not-found', 'Presentation not found');
    }

    const presData = presDoc.data()!;
    const slides = presData.slides || [];

    // Build answer key from quiz elements across all slides
    const answerKey: Record<string, {
      type: string;
      correctAnswerIndex: number;
      timeLimit: number;
      pointValue: number;
    }> = {};

    for (const slide of slides) {
      for (const element of slide.elements || []) {
        if (element.type === 'quiz' && element.quizConfig) {
          answerKey[element.id] = {
            type: 'quiz',
            correctAnswerIndex: element.quizConfig.correctAnswerIndex,
            timeLimit: element.quizConfig.timeLimit || 20,
            pointValue: element.quizConfig.pointValue || 1000,
          };
        }
      }
    }

    // Sanitize slides for players (strip correct answers from quiz elements)
    // Mirrors sanitizeSlideForPlayer() in src/lib/question-utils.ts
    const sanitizedSlides = slides.map((slide: { elements?: Array<{ type: string; quizConfig?: { correctAnswerIndex: number; [key: string]: unknown }; [key: string]: unknown }>; [key: string]: unknown }) => ({
      ...slide,
      elements: (slide.elements || []).map((el) => {
        if (el.type === 'quiz' && el.quizConfig) {
          const { correctAnswerIndex, ...safeConfig } = el.quizConfig;
          return { ...el, quizConfig: safeConfig };
        }
        return el;
      }),
    }));

    // Write answer key (admin-only access, not readable by clients)
    await db.doc(`games/${gameId}/aggregates/answerKey`).set({
      elements: answerKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Write sanitized slides to game document (safe for player reads)
    await db.doc(`games/${gameId}`).update({
      sanitizedSlides,
    });

    // Initialize leaderboard
    await db.doc(`games/${gameId}/aggregates/leaderboard`).set({
      topPlayers: [],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      quizElementCount: Object.keys(answerKey).length,
    };
  }
);
