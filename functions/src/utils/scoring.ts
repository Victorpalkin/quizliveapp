import { SubmitAnswerRequest } from '../types';

/**
 * Result of score calculation
 */
export interface ScoringResult {
  points: number;
  isCorrect: boolean;
  isPartiallyCorrect: boolean;
}

/**
 * Calculate score for a single-choice question
 * Base 100 points + up to 900 time bonus
 *
 * @param answerIndex - The selected answer index
 * @param correctAnswerIndex - The correct answer index
 * @param timeRemaining - Time remaining when answer was submitted
 * @param timeLimit - Total time limit for the question
 * @returns Scoring result with points and correctness
 */
export function scoreSingleChoice(
  answerIndex: number | undefined,
  correctAnswerIndex: number,
  timeRemaining: number,
  timeLimit: number
): ScoringResult {
  const selectedIndex = answerIndex !== undefined ? answerIndex : -1;
  const isCorrect = selectedIndex !== -1 && selectedIndex === correctAnswerIndex;

  let points = 0;
  if (isCorrect) {
    // Base 100 points + up to 900 time bonus
    points = 100;
    const timeBonus = Math.round((timeRemaining / timeLimit) * 900);
    points = Math.min(1000, points + timeBonus);
  }

  return { points, isCorrect, isPartiallyCorrect: false };
}

/**
 * Calculate score for a multiple-choice question
 * Proportional scoring with penalties for wrong answers
 * 50/50 split: 50% accuracy, 50% speed
 *
 * @param answerIndices - The selected answer indices
 * @param correctAnswerIndices - The correct answer indices
 * @param timeRemaining - Time remaining when answer was submitted
 * @param timeLimit - Total time limit for the question
 * @returns Scoring result with points and correctness
 */
export function scoreMultipleChoice(
  answerIndices: number[],
  correctAnswerIndices: number[],
  timeRemaining: number,
  timeLimit: number
): ScoringResult {
  const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
  const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
  const totalCorrect = correctAnswerIndices.length;

  // Proportional scoring
  const correctRatio = correctSelected / totalCorrect;
  const penalty = wrongSelected * 0.2;  // 20% penalty per wrong answer
  const scoreMultiplier = Math.max(0, correctRatio - penalty);

  // 50/50 split: 50% accuracy, 50% speed
  const accuracyComponent = Math.round(500 * scoreMultiplier);
  const speedComponent = Math.round(500 * (timeRemaining / timeLimit));
  const points = accuracyComponent + speedComponent;

  // Fully correct: all correct selected, no wrong
  const isCorrect = correctSelected === totalCorrect && wrongSelected === 0;

  // Partially correct: got some points but not fully correct
  const isPartiallyCorrect = !isCorrect && scoreMultiplier > 0;

  return { points, isCorrect, isPartiallyCorrect };
}

/**
 * Calculate score for a slider question
 * Quadratic scoring based on proximity to correct value
 * 50/50 split: 50% accuracy, 50% speed
 *
 * @param sliderValue - The selected slider value
 * @param correctValue - The correct value
 * @param minValue - Minimum slider value
 * @param maxValue - Maximum slider value
 * @param timeRemaining - Time remaining when answer was submitted
 * @param timeLimit - Total time limit for the question
 * @param acceptableError - Optional threshold for "correct" (defaults to 5% of range)
 * @returns Scoring result with points and correctness
 */
export function scoreSlider(
  sliderValue: number,
  correctValue: number,
  minValue: number,
  maxValue: number,
  timeRemaining: number,
  timeLimit: number,
  acceptableError?: number
): ScoringResult {
  const range = maxValue - minValue;
  const distance = Math.abs(sliderValue - correctValue);
  const accuracy = Math.max(0, 1 - (distance / range));  // 1.0 = perfect, 0.0 = worst

  // Quadratic scoring: rewards closeness, penalizes distance
  const scoreMultiplier = Math.pow(accuracy, 2);

  // 50/50 split: 50% accuracy, 50% speed
  const accuracyComponent = Math.round(500 * scoreMultiplier);
  const speedComponent = Math.round(500 * (timeRemaining / timeLimit));
  const points = accuracyComponent + speedComponent;

  // Configurable acceptable error threshold (default: 5% of range)
  const threshold = acceptableError ?? (range * 0.05);
  const isCorrect = distance <= threshold;

  return { points, isCorrect, isPartiallyCorrect: false };
}

/**
 * Calculate score for a poll question
 * Poll questions have no correct answer and award no points
 *
 * @returns Zero points and not correct
 */
export function scorePoll(): ScoringResult {
  return { points: 0, isCorrect: false, isPartiallyCorrect: false };
}

/**
 * Calculate score based on question type
 *
 * @param request - The submit answer request data
 * @param timeLimit - Total time limit for the question
 * @returns Scoring result with points and correctness
 */
export function calculateScore(
  request: SubmitAnswerRequest,
  timeLimit: number
): ScoringResult {
  const { questionType, timeRemaining } = request;

  switch (questionType) {
    case 'single-choice':
      return scoreSingleChoice(
        request.answerIndex,
        request.correctAnswerIndex!,
        timeRemaining,
        timeLimit
      );

    case 'multiple-choice':
      return scoreMultipleChoice(
        request.answerIndices!,
        request.correctAnswerIndices!,
        timeRemaining,
        timeLimit
      );

    case 'slider':
      return scoreSlider(
        request.sliderValue!,
        request.correctValue!,
        request.minValue!,
        request.maxValue!,
        timeRemaining,
        timeLimit,
        request.acceptableError
      );

    case 'poll-single':
    case 'poll-multiple':
      return scorePoll();

    default:
      // This should never happen due to TypeScript typing
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

/**
 * Calculate player's new streak
 * Streak only applies to scored questions (single-choice, multiple-choice, slider)
 * Polls don't affect the streak
 *
 * @param questionType - The type of question
 * @param isCorrect - Whether the answer was correct
 * @param currentStreak - The player's current streak
 * @returns The new streak value
 */
export function calculateStreak(
  questionType: string,
  isCorrect: boolean,
  currentStreak: number
): number {
  // Polls don't affect streak - keep current value
  if (questionType === 'poll-single' || questionType === 'poll-multiple') {
    return currentStreak;
  }

  // Increment streak on correct answer
  if (isCorrect) {
    return currentStreak + 1;
  }

  // Reset streak on wrong answer or timeout
  return 0;
}
