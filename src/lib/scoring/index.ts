// Scoring configuration and utilities
// Used by both client (optimistic UI) and server (authoritative scoring)

export interface ScoringConfig {
  basePoints: number;
  maxBonus: number;
  maxTotal: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  basePoints: 100,
  maxBonus: 900,
  maxTotal: 1000,
};

/**
 * Calculate score for questions with a single correct answer (single-choice)
 * Formula: Base points + time bonus (capped at max total)
 */
export function calculateTimeBasedScore(
  isCorrect: boolean,
  timeRemaining: number,
  timeLimit: number,
  config: ScoringConfig = DEFAULT_SCORING
): number {
  if (!isCorrect) return 0;

  const timeBonus = Math.round((timeRemaining / timeLimit) * config.maxBonus);
  return Math.min(config.maxTotal, config.basePoints + timeBonus);
}

/**
 * Calculate score for multiple-choice questions
 * Formula: 50% accuracy (proportional to correct answers) + 50% speed
 * Includes penalty for wrong answers (20% per wrong answer)
 */
export function calculateProportionalScore(
  correctCount: number,
  wrongCount: number,
  totalCorrect: number,
  timeRemaining: number,
  timeLimit: number
): number {
  // Calculate accuracy with penalty for wrong answers
  const correctRatio = correctCount / totalCorrect;
  const penalty = wrongCount * 0.2;
  const scoreMultiplier = Math.max(0, correctRatio - penalty);

  // 50% accuracy component, 50% speed component
  const accuracyComponent = Math.round(500 * scoreMultiplier);
  const speedComponent = Math.round(500 * (timeRemaining / timeLimit));

  return accuracyComponent + speedComponent;
}

/**
 * Calculate score for slider questions
 * Formula: Quadratic accuracy scoring (50% accuracy + 50% speed)
 * Closer answers score higher due to quadratic formula
 */
export function calculateSliderScore(
  value: number,
  correctValue: number,
  minValue: number,
  maxValue: number,
  timeRemaining: number,
  timeLimit: number,
  acceptableError?: number
): { points: number; isCorrect: boolean } {
  const range = maxValue - minValue;
  const distance = Math.abs(value - correctValue);
  const accuracy = Math.max(0, 1 - (distance / range));

  // Quadratic scoring rewards closer answers more
  const scoreMultiplier = Math.pow(accuracy, 2);
  const accuracyComponent = Math.round(500 * scoreMultiplier);
  const speedComponent = Math.round(500 * (timeRemaining / timeLimit));
  const points = accuracyComponent + speedComponent;

  // Determine if answer is "correct" based on threshold
  const threshold = acceptableError ?? (range * 0.05);
  const isCorrect = distance <= threshold;

  return { points, isCorrect };
}

/**
 * Poll questions don't award points
 */
export function calculatePollScore(): number {
  return 0;
}
