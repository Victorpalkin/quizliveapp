import type { Game, Quiz, Question } from '@/lib/types';

/**
 * Gets the effective questions for a game.
 * Returns game.questions if available (used when crowdsourced questions are integrated),
 * otherwise falls back to quiz.questions.
 *
 * Note: For players, game.questions contains sanitized questions (no correct answers).
 * For hosts, quiz.questions contains full questions (with correct answers).
 */
export function getEffectiveQuestions(game: Game | null | undefined, quiz: Quiz | null | undefined): Question[] {
  if (!game && !quiz) return [];
  // Prefer game.questions (contains sanitized/integrated questions)
  if (game?.questions && game.questions.length > 0) {
    return game.questions;
  }
  // Fall back to quiz.questions (for host, or legacy games)
  return quiz?.questions || [];
}

/**
 * Determines if the current question is the last question in the quiz
 * Overloaded version that can accept either quiz or totalQuestions
 *
 * @param game - The game object containing currentQuestionIndex
 * @param quizOrTotalQuestions - Either the quiz object or the total number of questions
 * @returns true if current question is the last one, false otherwise
 */
export function isLastQuestion(game: Game | null | undefined, quizOrTotalQuestions: Quiz | null | undefined | number): boolean {
  if (!game) return false;

  // Determine total questions count
  let totalQuestions: number;
  if (typeof quizOrTotalQuestions === 'number') {
    totalQuestions = quizOrTotalQuestions;
  } else {
    const questions = getEffectiveQuestions(game, quizOrTotalQuestions);
    totalQuestions = questions.length;
  }

  return game.currentQuestionIndex >= totalQuestions - 1;
}
