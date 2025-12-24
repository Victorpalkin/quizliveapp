/**
 * Statistical utility functions for rating and evaluation calculations.
 * Shared between:
 * - Standalone Evaluation (computeEvaluationResults.ts)
 * - Presentation Rating slides (client-side aggregation)
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
 * Calculate distribution of scores across buckets
 * Returns an array where index i contains the count of scores that round to (min + i)
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
    // For lowerIsBetter, invert the normalization so lower scores = higher normalized
    return (max - score) / (max - min);
  }
  return (score - min) / (max - min);
}

/**
 * Determine consensus level based on standard deviation relative to scale
 */
export function determineConsensusLevel(
  avgStdDev: number,
  scaleRange: number
): 'high' | 'medium' | 'low' {
  const normalizedStdDev = avgStdDev / scaleRange;

  // High consensus: stdDev < 15% of scale range
  if (normalizedStdDev < 0.15) return 'high';
  // Medium consensus: stdDev < 30% of scale range
  if (normalizedStdDev < 0.3) return 'medium';
  // Low consensus: high variance
  return 'low';
}

/**
 * Calculate basic statistics for an array of values
 */
export function calculateBasicStats(values: number[]): {
  count: number;
  sum: number;
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
} {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
    };
  }

  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const median = calculateMedian(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const stdDev = calculateStdDev(values, average);

  return { count, sum, average, median, min, max, stdDev };
}
