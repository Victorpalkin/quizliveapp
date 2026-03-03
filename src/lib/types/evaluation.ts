import { Timestamp } from 'firebase/firestore';

// ==========================================
// Evaluation Activity Types
// ==========================================

/**
 * A metric that items are scored on
 */
export interface EvaluationMetric {
  id: string;
  name: string;                    // e.g., "Impact", "Effort", "Complexity"
  description?: string;            // Help text for participants
  scaleType: 'stars' | 'numeric' | 'labels';
  scaleMin: number;                // e.g., 1
  scaleMax: number;                // e.g., 5 or 10
  scaleLabels?: string[];          // For 'labels' type: ["Low", "Medium", "High"]
  weight: number;                  // Weight for aggregate calculation (default: 1)
  lowerIsBetter: boolean;          // true for metrics like "Complexity", "Effort", "Risk"
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
 * Configuration for Evaluation activity
 */
export interface EvaluationConfig {
  metrics: EvaluationMetric[];           // 1-5 metrics to rate on
  predefinedItems: PredefinedItem[];     // Items pre-created by host
  allowParticipantItems: boolean;        // Can participants suggest items?
  maxItemsPerParticipant: number;        // If allowed, how many? (default: 3)
  requireApproval: boolean;              // Must host approve participant items?
  showItemSubmitter: boolean;            // Show who submitted each item?
}

/**
 * Evaluation activity stored in /activities/{activityId}
 */
export interface EvaluationActivity {
  id: string;
  type: 'evaluation';
  title: string;
  description?: string;
  hostId: string;
  config: EvaluationConfig;
  createdAt: Date;
  updatedAt: Date;
  // Optional source tracking for evaluations created from other activities
  sourceActivityId?: string;  // ID of source thoughts gathering activity
  sourceGameId?: string;      // ID of source game (for topics/submissions)
  sourceType?: 'thoughts-gathering'; // Type of source activity
}

/**
 * An item to be evaluated, stored in /games/{gameId}/items/{itemId}
 */
export interface EvaluationItem {
  id: string;
  text: string;                     // Item name/description
  description?: string;             // Optional longer description
  submittedBy?: string;             // Player name (if participant-submitted)
  submittedByPlayerId?: string;     // Player ID
  isHostItem: boolean;              // true if added by host
  approved: boolean;                // For participant items requiring approval
  order: number;                    // Display order
  createdAt: Timestamp;
}

/**
 * A player's ratings for all items, stored in /games/{gameId}/ratings/{playerId}
 */
export interface PlayerRatings {
  playerId: string;
  playerName: string;
  ratings: {
    [itemId: string]: {
      [metricId: string]: number;   // The score given
    };
  };
  submittedAt: Timestamp;
  isComplete: boolean;              // Rated all items on all metrics
}

/**
 * Aggregated results for a single item
 */
export interface EvaluationItemResult {
  itemId: string;
  itemText: string;
  itemDescription?: string;         // Optional item description
  overallScore: number;             // Weighted average across metrics (0-1 normalized)
  rank: number;                     // Final position
  metricScores: {
    [metricId: string]: {
      rawAverage: number;           // Original scale average (e.g., 3.5 on 1-5 scale)
      normalizedAverage: number;    // 0-1 normalized (accounts for lowerIsBetter)
      median: number;
      stdDev: number;               // For consensus calculation
      distribution: number[];       // Count per score value
      responseCount: number;
    };
  };
  consensusLevel: 'high' | 'medium' | 'low';  // Based on stdDev
}

/**
 * Aggregated evaluation results stored in /games/{gameId}/aggregates/evaluations
 */
export interface EvaluationResults {
  items: EvaluationItemResult[];
  totalParticipants: number;
  participantsWhoRated: number;
  processedAt: Timestamp;
}
