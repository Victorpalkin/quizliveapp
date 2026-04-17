/**
 * Cloud Function to compute evaluation results
 *
 * This function aggregates all player ratings and computes:
 * - Per-metric averages, medians, and standard deviations
 * - Normalized scores (accounting for lowerIsBetter)
 * - Weighted overall scores
 * - Consensus levels based on variance
 * - Final rankings
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  ComputeEvaluationResultsRequest,
  ComputeEvaluationResultsResult,
  EvaluationActivity,
  EvaluationItem,
  PlayerRatings,
  EvaluationItemResult,
  EvaluationResults,
  MetricScoreDetails,
} from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import {
  calculateMedian,
  calculateStdDev,
  normalizeScore,
  calculateDistribution,
  determineConsensusLevel,
} from '../utils/evaluationCalc';

const firestore = admin.firestore();

export const computeEvaluationResults = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    enforceAppCheck: true,
  },
  async (request): Promise<ComputeEvaluationResultsResult> => {
    verifyAppCheck(request);

    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to compute results');
    }

    const data = request.data as ComputeEvaluationResultsRequest;
    const { gameId } = data;

    if (!gameId) {
      throw new HttpsError('invalid-argument', 'Missing gameId');
    }

    try {
      // Fetch game document
      const gameDoc = await firestore.collection('games').doc(gameId).get();

      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }

      const gameData = gameDoc.data();

      if (gameData?.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can compute results');
      }

      if (gameData?.activityType !== 'evaluation') {
        throw new HttpsError('invalid-argument', 'Not an evaluation game');
      }

      // Fetch activity for metrics configuration
      const activityDoc = await firestore
        .collection('activities')
        .doc(gameData.activityId)
        .get();

      if (!activityDoc.exists) {
        throw new HttpsError('not-found', 'Activity not found');
      }

      const activity = {
        id: activityDoc.id,
        ...activityDoc.data(),
      } as EvaluationActivity;

      const metrics = activity.config.metrics;

      // Fetch all approved items
      const itemsSnapshot = await firestore
        .collection('games')
        .doc(gameId)
        .collection('items')
        .where('approved', '==', true)
        .orderBy('order', 'asc')
        .get();

      const items: EvaluationItem[] = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EvaluationItem[];

      if (items.length === 0) {
        throw new HttpsError('failed-precondition', 'No items to rank');
      }

      // Fetch all player ratings
      const ratingsSnapshot = await firestore
        .collection('games')
        .doc(gameId)
        .collection('ratings')
        .get();

      const allRatings: PlayerRatings[] = ratingsSnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as PlayerRatings[];

      // Fetch total player count
      const playersSnapshot = await firestore
        .collection('games')
        .doc(gameId)
        .collection('players')
        .get();

      const totalParticipants = playersSnapshot.size;
      const participantsWhoRated = allRatings.length;

      // Process each item
      const itemResults: EvaluationItemResult[] = [];

      for (const item of items) {
        const metricScores: { [metricId: string]: MetricScoreDetails } = {};
        let totalWeightedNormalized = 0;
        let totalWeight = 0;
        const stdDevs: number[] = [];
        const scaleRanges: number[] = [];

        for (const metric of metrics) {
          // Collect all scores for this item and metric
          const scores: number[] = [];

          for (const playerRating of allRatings) {
            const itemRatings = playerRating.ratings[item.id];
            if (itemRatings && typeof itemRatings[metric.id] === 'number') {
              scores.push(itemRatings[metric.id]);
            }
          }

          if (scores.length === 0) {
            // No ratings for this metric/item combination
            metricScores[metric.id] = {
              rawAverage: 0,
              normalizedAverage: 0.5,
              median: 0,
              stdDev: 0,
              distribution: new Array(metric.scaleMax - metric.scaleMin + 1).fill(0),
              responseCount: 0,
            };
            continue;
          }

          // Calculate statistics
          const rawAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
          const median = calculateMedian(scores);
          const stdDev = calculateStdDev(scores, rawAverage);
          const distribution = calculateDistribution(
            scores,
            metric.scaleMin,
            metric.scaleMax
          );

          // Normalize score (accounts for lowerIsBetter)
          const normalizedAverage = normalizeScore(
            rawAverage,
            metric.scaleMin,
            metric.scaleMax,
            metric.lowerIsBetter
          );

          metricScores[metric.id] = {
            rawAverage,
            normalizedAverage,
            median,
            stdDev,
            distribution,
            responseCount: scores.length,
          };

          // Accumulate for overall score
          totalWeightedNormalized += normalizedAverage * metric.weight;
          totalWeight += metric.weight;

          // Track for consensus calculation
          stdDevs.push(stdDev);
          scaleRanges.push(metric.scaleMax - metric.scaleMin);
        }

        // Calculate overall score (weighted average of normalized scores)
        const overallScore =
          totalWeight > 0 ? totalWeightedNormalized / totalWeight : 0;

        // Calculate average std dev relative to scale for consensus
        const avgStdDev =
          stdDevs.length > 0
            ? stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length
            : 0;
        const avgScaleRange =
          scaleRanges.length > 0
            ? scaleRanges.reduce((a, b) => a + b, 0) / scaleRanges.length
            : 1;

        const consensusLevel = determineConsensusLevel(avgStdDev, avgScaleRange);

        itemResults.push({
          itemId: item.id,
          itemText: item.text,
          ...(item.description && { itemDescription: item.description }),
          overallScore,
          rank: 0, // Will be assigned after sorting
          metricScores,
          consensusLevel,
        });
      }

      // Sort by overall score (highest first) and assign ranks
      itemResults.sort((a, b) => b.overallScore - a.overallScore);

      for (let i = 0; i < itemResults.length; i++) {
        itemResults[i].rank = i + 1;
      }

      // Create results document
      const results: EvaluationResults = {
        items: itemResults,
        totalParticipants,
        participantsWhoRated,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Store results
      await firestore
        .collection('games')
        .doc(gameId)
        .collection('aggregates')
        .doc('evaluations')
        .set(results);

      // Update game state to 'results'
      await firestore.collection('games').doc(gameId).update({
        state: 'results',
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
      console.error('Error computing evaluation results:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Error computing results: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
);
