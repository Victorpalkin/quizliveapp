import * as admin from 'firebase-admin';

/**
 * Metric configuration for evaluation activity
 */
export interface EvaluationMetric {
  id: string;
  name: string;
  description?: string;
  scaleType: 'stars' | 'numeric' | 'labels';
  scaleMin: number;
  scaleMax: number;
  scaleLabels?: string[];
  weight: number;
  lowerIsBetter: boolean;
}

/**
 * A predefined item template stored in activity config
 */
export interface PredefinedItem {
  id: string;
  text: string;
  description?: string;
}

/**
 * Evaluation activity configuration
 */
export interface EvaluationConfig {
  metrics: EvaluationMetric[];
  predefinedItems: PredefinedItem[];
  allowParticipantItems: boolean;
  maxItemsPerParticipant: number;
  requireApproval: boolean;
  showItemSubmitter: boolean;
}

/**
 * Evaluation activity document
 */
export interface EvaluationActivity {
  id: string;
  type: 'evaluation';
  title: string;
  description?: string;
  hostId: string;
  config: EvaluationConfig;
}

/**
 * Evaluation item to be rated
 */
export interface EvaluationItem {
  id: string;
  text: string;
  description?: string;
  submittedBy?: string;
  submittedByPlayerId?: string;
  isHostItem: boolean;
  approved: boolean;
  order: number;
}

/**
 * Player's ratings for items
 */
export interface PlayerRatings {
  playerId: string;
  playerName: string;
  ratings: {
    [itemId: string]: {
      [metricId: string]: number;
    };
  };
  isComplete: boolean;
}

/**
 * Metric score details for an item
 */
export interface MetricScoreDetails {
  rawAverage: number;
  normalizedAverage: number;
  median: number;
  stdDev: number;
  distribution: number[];
  responseCount: number;
}

/**
 * Individual item result with scores
 */
export interface EvaluationItemResult {
  itemId: string;
  itemText: string;
  itemDescription?: string;
  overallScore: number;
  rank: number;
  metricScores: {
    [metricId: string]: MetricScoreDetails;
  };
  consensusLevel: 'high' | 'medium' | 'low';
}

/**
 * Complete evaluation results document
 * Stored at: games/{gameId}/aggregates/evaluations
 */
export interface EvaluationResults {
  items: EvaluationItemResult[];
  totalParticipants: number;
  participantsWhoRated: number;
  processedAt: admin.firestore.FieldValue;
}

/**
 * Request interface for computeEvaluationResults Cloud Function
 */
export interface ComputeEvaluationResultsRequest {
  gameId: string;
}

/**
 * Result returned from computeEvaluationResults function
 */
export interface ComputeEvaluationResultsResult {
  success: boolean;
  message: string;
  results?: {
    totalItems: number;
    totalParticipants: number;
  };
}

// Backward-compatible aliases (deprecated — use Evaluation* names)
/** @deprecated Use EvaluationMetric */
export type RankingMetric = EvaluationMetric;
/** @deprecated Use EvaluationConfig */
export type RankingConfig = EvaluationConfig;
/** @deprecated Use EvaluationActivity */
export type RankingActivity = EvaluationActivity;
/** @deprecated Use EvaluationItem */
export type RankingItem = EvaluationItem;
/** @deprecated Use EvaluationItemResult */
export type RankingItemResult = EvaluationItemResult;
/** @deprecated Use EvaluationResults */
export type RankingResults = EvaluationResults;
/** @deprecated Use ComputeEvaluationResultsRequest */
export type ComputeRankingResultsRequest = ComputeEvaluationResultsRequest;
/** @deprecated Use ComputeEvaluationResultsResult */
export type ComputeRankingResultsResult = ComputeEvaluationResultsResult;
