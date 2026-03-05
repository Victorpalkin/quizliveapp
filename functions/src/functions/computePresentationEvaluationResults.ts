/**
 * Cloud Function to compute evaluation results for presentation elements
 *
 * Reads responses from games/{gameId}/responses filtered by elementId,
 * extracts evaluationRatings, and computes statistics.
 * Stores results in games/{gameId}/aggregates/evaluation-{elementId}
 */

import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { computeEvalResults, EvalMetric } from '../utils/evaluationCalc';
import { ALLOWED_ORIGINS, REGION } from '../config';

interface ComputePresentationEvaluationRequest {
  gameId: string;
  elementId: string;
  evaluationConfig: {
    title: string;
    description?: string;
    items: { id: string; text: string; description?: string }[];
    metrics: EvalMetric[];
  };
}

interface ComputePresentationEvaluationResult {
  success: boolean;
  message: string;
  results?: {
    totalItems: number;
    totalParticipants: number;
  };
}

const firestore = admin.firestore();

export const computePresentationEvaluationResults = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<ComputePresentationEvaluationResult> => {
    // Verify user is authenticated
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    const data = request.data as ComputePresentationEvaluationRequest;
    const { gameId, elementId, evaluationConfig } = data;

    if (!gameId || !elementId || !evaluationConfig) {
      return { success: false, message: 'Missing required parameters: gameId, elementId, evaluationConfig' };
    }

    try {
      // Verify the user is the host
      const gameDoc = await firestore.collection('games').doc(gameId).get();
      if (!gameDoc.exists) {
        return { success: false, message: 'Game not found' };
      }

      const gameData = gameDoc.data();
      if (gameData?.hostId !== request.auth.uid) {
        return { success: false, message: 'Only the game host can compute results' };
      }

      // Fetch responses for this element
      const responsesSnapshot = await firestore
        .collection('games')
        .doc(gameId)
        .collection('responses')
        .where('elementId', '==', elementId)
        .get();

      if (responsesSnapshot.empty) {
        // Store empty results
        await firestore
          .collection('games')
          .doc(gameId)
          .collection('aggregates')
          .doc(`evaluation-${elementId}`)
          .set({
            items: [],
            totalParticipants: 0,
            participantsWhoRated: 0,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            elementId,
          });

        return { success: true, message: 'No responses to process', results: { totalItems: 0, totalParticipants: 0 } };
      }

      // Extract evaluationRatings from each response
      const allRatings: Record<string, Record<string, number>>[] = [];
      for (const docSnap of responsesSnapshot.docs) {
        const respData = docSnap.data();
        if (respData.evaluationRatings) {
          allRatings.push(respData.evaluationRatings);
        }
      }

      // Fetch player count
      const playersSnapshot = await firestore
        .collection('games')
        .doc(gameId)
        .collection('players')
        .get();

      const totalParticipants = playersSnapshot.size;
      const participantsWhoRated = allRatings.length;

      // Compute results using shared utility
      const itemResults = computeEvalResults(
        evaluationConfig.items,
        evaluationConfig.metrics,
        allRatings
      );

      // Store results
      await firestore
        .collection('games')
        .doc(gameId)
        .collection('aggregates')
        .doc(`evaluation-${elementId}`)
        .set({
          items: itemResults,
          totalParticipants,
          participantsWhoRated,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          elementId,
        });

      return {
        success: true,
        message: 'Evaluation results computed successfully',
        results: {
          totalItems: itemResults.length,
          totalParticipants: participantsWhoRated,
        },
      };
    } catch (error) {
      console.error('Error computing presentation evaluation results:', error);
      return {
        success: false,
        message: `Error computing results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);
