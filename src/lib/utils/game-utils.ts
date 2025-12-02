import type { Game, Quiz, Question } from '@/lib/types';

/**
 * Gets the effective questions for a game.
 * Returns game.questions if available (used when crowdsourced questions are integrated),
 * otherwise falls back to quiz.questions.
 */
export function getEffectiveQuestions(game: Game | null | undefined, quiz: Quiz | null | undefined): Question[] {
  if (!game && !quiz) return [];
  // Prefer game.questions (contains integrated crowdsourced questions)
  if (game?.questions && game.questions.length > 0) {
    return game.questions;
  }
  // Fall back to quiz.questions
  return quiz?.questions || [];
}

/**
 * Determines if the current question is the last question in the quiz
 * @param game - The game object containing currentQuestionIndex
 * @param quiz - The quiz object containing questions array
 * @returns true if current question is the last one, false otherwise
 */
export function isLastQuestion(game: Game | null | undefined, quiz: Quiz | null | undefined): boolean {
  if (!game || !quiz) return false;
  const questions = getEffectiveQuestions(game, quiz);
  return game.currentQuestionIndex >= questions.length - 1;
}
