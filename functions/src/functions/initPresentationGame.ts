import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';
import { AnswerKeyEntry } from '../types';
import type { PresentationSlideType } from '../types';

interface InitPresentationGameRequest {
  gameId: string;
}

interface InitPresentationGameResult {
  success: boolean;
  message: string;
}

/**
 * Cloud Function to initialize a presentation game.
 * Creates the answer key and leaderboard aggregate documents server-side
 * to prevent client-side manipulation.
 *
 * Called from the lobby when the host starts the presentation.
 */
export const initPresentationGame = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 10,
    memory: '256MiB',
    maxInstances: 10,
    concurrency: 80,
    enforceAppCheck: true,
  },
  async (request): Promise<InitPresentationGameResult> => {
    verifyAppCheck(request);

    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { gameId } = request.data as InitPresentationGameRequest;
    if (!gameId) {
      throw new HttpsError('invalid-argument', 'gameId is required');
    }

    const db = admin.firestore();

    // Get the game document
    const gameDoc = await db.doc(`games/${gameId}`).get();
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data()!;

    // Verify the caller is the host
    if (gameData.hostId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the host can initialize the game');
    }

    // Verify it's a presentation game in lobby state
    if (gameData.activityType !== 'presentation') {
      throw new HttpsError('failed-precondition', 'Not a presentation game');
    }
    if (gameData.state !== 'lobby') {
      throw new HttpsError('failed-precondition', 'Game is not in lobby state');
    }

    // Get the presentation document
    const presentationId = gameData.presentationId;
    if (!presentationId) {
      throw new HttpsError('failed-precondition', 'No presentation linked to this game');
    }

    const presentationDoc = await db.doc(`presentations/${presentationId}`).get();
    if (!presentationDoc.exists) {
      throw new HttpsError('not-found', 'Presentation not found');
    }

    const presentationData = presentationDoc.data()!;
    const slides = presentationData.slides || [];

    // Build answer key from slides (server-side)
    const questions: AnswerKeyEntry[] = slides.map((slide: Record<string, unknown>) => {
      const slideType = slide.type as PresentationSlideType;
      const question = slide.question as Record<string, unknown> | undefined;

      if ((slideType === 'quiz' || slideType === 'poll') && question) {
        const qType = question.type as string;
        const isPollType = ['poll-single', 'poll-multiple', 'poll-free-text'].includes(qType);
        const INFINITE_TIME_LIMIT = 99999;

        const base = {
          type: qType,
          timeLimit: isPollType ? INFINITE_TIME_LIMIT : ((question.timeLimit as number) || 20),
        };

        switch (qType) {
          case 'single-choice':
            return { ...base, correctAnswerIndex: question.correctAnswerIndex };
          case 'multiple-choice':
            return { ...base, correctAnswerIndices: question.correctAnswerIndices };
          case 'slider':
            return {
              ...base,
              correctValue: question.correctValue,
              minValue: question.minValue,
              maxValue: question.maxValue,
              acceptableError: question.acceptableError,
            };
          case 'free-response':
            return {
              ...base,
              correctAnswer: question.correctAnswer,
              alternativeAnswers: question.alternativeAnswers,
              caseSensitive: question.caseSensitive,
              allowTypos: question.allowTypos,
            };
          default:
            return base;
        }
      }

      // Non-scorable slides
      return { type: slideType, timeLimit: 0 };
    });

    // Count players
    const playersSnapshot = await db.collection(`games/${gameId}/players`).count().get();
    const playerCount = playersSnapshot.data().count;

    // Write both documents in a batch
    const batch = db.batch();

    batch.set(db.doc(`games/${gameId}/aggregates/answerKey`), { questions });
    batch.set(db.doc(`games/${gameId}/aggregates/leaderboard`), {
      topPlayers: [],
      totalPlayers: playerCount,
      totalAnswered: 0,
      answerCounts: [],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      success: true,
      message: `Game initialized with ${slides.length} slides and ${playerCount} players`,
    };
  }
);
