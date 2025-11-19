import type { Question } from '../types';

/**
 * Base interface for question type handlers
 * Implements the Strategy pattern for different question types
 */
export interface QuestionHandler<T extends Question> {
  type: T['type'];

  /**
   * Validate that an answer is in the correct format
   */
  validateAnswer(answer: any): boolean;

  /**
   * Calculate score for an answer (client-side estimation)
   */
  calculateScore(answer: any, question: T, timeRemaining: number): number;

  /**
   * Get default/empty answer value for this question type
   */
  getDefaultAnswer(question: T): any;

  /**
   * Check if this question type has a correct answer (vs poll/slide)
   */
  hasCorrectAnswer(question: T): boolean;

  /**
   * Get the correct answer(s) for display purposes
   */
  getCorrectAnswers(question: T): any;

  /**
   * Check if answer is correct
   */
  isCorrectAnswer(answer: any, question: T): boolean;
}
