import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { enforceRateLimitInMemory } from '../utils/rateLimit';

interface SubmitPresentationAnswerRequest {
  gameId: string;
  elementId: string;
  slideId: string;
  playerId: string;
  playerName: string;
  answerIndex: number;
  timeRemaining: number;
}

/**
 * Cloud Function for server-side scoring of presentation quiz answers.
 *
 * Scoring formula:
 * - Base: pointValue (default 1000) for correct answer
 * - Speed bonus: (timeRemaining / timeLimit) * 500
 * - Streak multiplier: min(1.0 + streak * 0.1, 2.0) (max 2x at 10-streak)
 * - Total: (base + speedBonus) * streakMultiplier
 */
export const submitPresentationAnswer = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 10,
    memory: '256MiB',
    enforceAppCheck: true,
  },
  async (request) => {
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    const data = request.data as SubmitPresentationAnswerRequest;
    const { gameId, elementId, slideId, playerId, playerName, answerIndex, timeRemaining } = data;

    // Validate required fields
    if (!gameId || !elementId || !slideId || !playerId || !playerName) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    if (typeof answerIndex !== 'number' || answerIndex < 0) {
      throw new HttpsError('invalid-argument', 'Invalid answerIndex');
    }

    if (typeof timeRemaining !== 'number' || timeRemaining < 0) {
      throw new HttpsError('invalid-argument', 'Invalid timeRemaining');
    }

    // Rate limiting
    enforceRateLimitInMemory(`pres-submit:${playerId}`, 60, 60);

    const db = admin.firestore();

    // Use transaction to prevent race conditions
    const result = await db.runTransaction(async (transaction) => {
      // Check game state
      const gameRef = db.doc(`games/${gameId}`);
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const gameData = gameDoc.data()!;
      if (gameData.state !== 'active') {
        throw new HttpsError('failed-precondition', 'Game is not active');
      }

      // Check if already answered
      const responseId = `${elementId}_${playerId}`;
      const responseRef = db.doc(`games/${gameId}/responses/${responseId}`);
      const existingResponse = await transaction.get(responseRef);

      if (existingResponse.exists) {
        throw new HttpsError('already-exists', 'Already answered this question');
      }

      // Get answer key
      const answerKeyDoc = await transaction.get(db.doc(`games/${gameId}/aggregates/answerKey`));
      if (!answerKeyDoc.exists) {
        throw new HttpsError('internal', 'Answer key not found');
      }

      const answerKey = answerKeyDoc.data()!.elements || {};
      const elementKey = answerKey[elementId];

      if (!elementKey) {
        throw new HttpsError('not-found', 'Element not found in answer key');
      }

      // Score the answer
      const isCorrect = answerIndex === elementKey.correctAnswerIndex;
      const timeLimit = elementKey.timeLimit || 20;
      const pointValue = elementKey.pointValue || 1000;

      // Get player data for streak
      const playerRef = db.doc(`games/${gameId}/players/${playerId}`);
      const playerDoc = await transaction.get(playerRef);

      if (!playerDoc.exists) {
        throw new HttpsError('not-found', 'Player not found');
      }

      // Read leaderboard before any writes (Firestore requires all reads before writes)
      const leaderboardRef = db.doc(`games/${gameId}/aggregates/leaderboard`);
      const leaderboardDoc = await transaction.get(leaderboardRef);

      const playerData = playerDoc.data()!;
      const currentStreak = playerData.currentStreak || 0;

      let points = 0;
      let newStreak = currentStreak;

      if (isCorrect) {
        // Base points
        const base = pointValue;
        // Speed bonus: faster answers earn more
        const speedBonus = timeLimit > 0 ? Math.round((timeRemaining / timeLimit) * 500) : 0;
        // Streak multiplier: builds up to 2x at 10-streak
        const streakMultiplier = Math.min(1.0 + currentStreak * 0.1, 2.0);

        points = Math.round((base + speedBonus) * streakMultiplier);
        newStreak = currentStreak + 1;
      } else {
        newStreak = 0;
      }

      // Save response
      transaction.set(responseRef, {
        elementId,
        slideId,
        playerId,
        playerName,
        answerIndex,
        timeRemaining,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update player score and streak
      const newScore = (playerData.score || 0) + points;
      const maxStreak = Math.max(playerData.maxStreak || 0, newStreak);

      transaction.update(playerRef, {
        score: newScore,
        currentStreak: newStreak,
        maxStreak,
      });

      // Update leaderboard (simplified - update in-place)
      const topPlayers: Array<{ playerId: string; playerName: string; score: number; streak: number }> =
        leaderboardDoc.exists ? leaderboardDoc.data()!.topPlayers || [] : [];

      // Update or add player entry
      const existingIdx = topPlayers.findIndex((p) => p.playerId === playerId);
      if (existingIdx >= 0) {
        topPlayers[existingIdx] = { playerId, playerName, score: newScore, streak: newStreak };
      } else {
        topPlayers.push({ playerId, playerName, score: newScore, streak: newStreak });
      }

      // Sort by score descending and keep top 50
      topPlayers.sort((a, b) => b.score - a.score);
      const trimmed = topPlayers.slice(0, 50);

      transaction.set(leaderboardRef, {
        topPlayers: trimmed,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        isCorrect,
        points,
        newScore,
        streak: newStreak,
        maxStreak,
      };
    });

    return {
      success: true,
      ...result,
    };
  }
);
