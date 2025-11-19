import type { Game, Quiz } from '@/lib/types';

/**
 * Determines if the current question is the last question in the quiz
 * @param game - The game object containing currentQuestionIndex
 * @param quiz - The quiz object containing questions array
 * @returns true if current question is the last one, false otherwise
 */
export function isLastQuestion(game: Game | null | undefined, quiz: Quiz | null | undefined): boolean {
  if (!game || !quiz) return false;
  return game.currentQuestionIndex >= quiz.questions.length - 1;
}
