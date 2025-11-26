import type { FreeResponseQuestion } from '../types';
import type { QuestionHandler } from './base';
import { calculateTimeBasedScore } from '../scoring';

/**
 * Simple client-side fuzzy matching for optimistic UI
 * The server performs more thorough matching
 */
function simpleMatch(
  answer: string,
  correctAnswer: string,
  caseSensitive: boolean = false
): boolean {
  const normalize = (s: string) => {
    let result = s.trim();
    if (!caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  };

  return normalize(answer) === normalize(correctAnswer);
}

export class FreeResponseHandler implements QuestionHandler<FreeResponseQuestion> {
  type = 'free-response' as const;

  validateAnswer(value: any): boolean {
    return typeof value === 'string';
  }

  calculateScore(
    answer: string,
    question: FreeResponseQuestion,
    timeRemaining: number
  ): number {
    // Client-side optimistic scoring - assume correct if non-empty
    // Server will do the actual fuzzy matching
    if (!answer.trim()) {
      return 0;
    }

    // Check against all correct answers
    const allCorrect = [question.correctAnswer, ...(question.alternativeAnswers || [])];
    const isCorrect = allCorrect.some(correct =>
      simpleMatch(answer, correct, question.caseSensitive)
    );

    return isCorrect
      ? calculateTimeBasedScore(true, timeRemaining, question.timeLimit || 30)
      : 0;
  }

  getDefaultAnswer(): string {
    return '';
  }

  hasCorrectAnswer(): boolean {
    return true;
  }

  getCorrectAnswers(question: FreeResponseQuestion): string[] {
    return [question.correctAnswer, ...(question.alternativeAnswers || [])];
  }

  isCorrectAnswer(answer: string, question: FreeResponseQuestion): boolean {
    if (!answer.trim()) {
      return false;
    }

    const allCorrect = [question.correctAnswer, ...(question.alternativeAnswers || [])];
    return allCorrect.some(correct =>
      simpleMatch(answer, correct, question.caseSensitive)
    );
  }
}
