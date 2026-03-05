/**
 * Shared evaluation calculation utilities
 * Used by both standalone evaluation and presentation evaluation Cloud Functions
 */

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;

  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Normalize a score to 0-1 range, accounting for lowerIsBetter
 */
export function normalizeScore(
  score: number,
  min: number,
  max: number,
  lowerIsBetter: boolean
): number {
  if (max === min) return 0.5;

  if (lowerIsBetter) {
    return (max - score) / (max - min);
  }
  return (score - min) / (max - min);
}

/**
 * Calculate distribution of scores for a metric
 */
export function calculateDistribution(
  scores: number[],
  min: number,
  max: number
): number[] {
  const bucketCount = max - min + 1;
  const distribution = new Array(bucketCount).fill(0);

  for (const score of scores) {
    const bucketIndex = Math.round(score) - min;
    if (bucketIndex >= 0 && bucketIndex < bucketCount) {
      distribution[bucketIndex]++;
    }
  }

  return distribution;
}

/**
 * Determine consensus level based on standard deviation relative to scale
 */
export function determineConsensusLevel(
  avgStdDev: number,
  scaleRange: number
): 'high' | 'medium' | 'low' {
  const normalizedStdDev = avgStdDev / scaleRange;

  if (normalizedStdDev < 0.15) return 'high';
  if (normalizedStdDev < 0.3) return 'medium';
  return 'low';
}

/**
 * Metric configuration for evaluation
 */
export interface EvalMetric {
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
 * Item result from evaluation
 */
export interface EvalItemResult {
  itemId: string;
  itemText: string;
  itemDescription?: string;
  overallScore: number;
  rank: number;
  metricScores: {
    [metricId: string]: {
      rawAverage: number;
      normalizedAverage: number;
      median: number;
      stdDev: number;
      distribution: number[];
      responseCount: number;
    };
  };
  consensusLevel: 'high' | 'medium' | 'low';
}

/**
 * Compute evaluation results for a set of items and ratings
 */
export function computeEvalResults(
  items: { id: string; text: string; description?: string }[],
  metrics: EvalMetric[],
  allRatings: Record<string, Record<string, number>>[] // array of { itemId -> { metricId -> value } }
): EvalItemResult[] {
  const itemResults: EvalItemResult[] = [];

  for (const item of items) {
    const metricScores: EvalItemResult['metricScores'] = {};
    let totalWeightedNormalized = 0;
    let totalWeight = 0;
    const stdDevs: number[] = [];
    const scaleRanges: number[] = [];

    for (const metric of metrics) {
      const scores: number[] = [];

      for (const playerRating of allRatings) {
        const itemRatings = playerRating[item.id];
        if (itemRatings && typeof itemRatings[metric.id] === 'number') {
          scores.push(itemRatings[metric.id]);
        }
      }

      if (scores.length === 0) {
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

      const rawAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
      const median = calculateMedian(scores);
      const stdDev = calculateStdDev(scores, rawAverage);
      const distribution = calculateDistribution(scores, metric.scaleMin, metric.scaleMax);
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

      totalWeightedNormalized += normalizedAverage * metric.weight;
      totalWeight += metric.weight;
      stdDevs.push(stdDev);
      scaleRanges.push(metric.scaleMax - metric.scaleMin);
    }

    const overallScore = totalWeight > 0 ? totalWeightedNormalized / totalWeight : 0;
    const avgStdDev = stdDevs.length > 0 ? stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length : 0;
    const avgScaleRange = scaleRanges.length > 0 ? scaleRanges.reduce((a, b) => a + b, 0) / scaleRanges.length : 1;
    const consensusLevel = determineConsensusLevel(avgStdDev, avgScaleRange);

    itemResults.push({
      itemId: item.id,
      itemText: item.text,
      ...(item.description && { itemDescription: item.description }),
      overallScore,
      rank: 0,
      metricScores,
      consensusLevel,
    });
  }

  // Sort by overall score and assign ranks
  itemResults.sort((a, b) => b.overallScore - a.overallScore);
  for (let i = 0; i < itemResults.length; i++) {
    itemResults[i].rank = i + 1;
  }

  return itemResults;
}
