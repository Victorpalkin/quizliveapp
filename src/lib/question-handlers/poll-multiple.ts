import type { PollMultipleQuestion } from '../types';
import type { QuestionHandler } from './base';

export class PollMultipleHandler implements QuestionHandler<PollMultipleQuestion> {
  type = 'poll-multiple' as const;

  validateAnswer(answerIndices: any): boolean {
    return Array.isArray(answerIndices) && answerIndices.every(i => typeof i === 'number' && i >= 0);
  }

  calculateScore(): number {
    return 0; // Polls don't award points
  }

  getDefaultAnswer(): number[] {
    return [];
  }

  hasCorrectAnswer(): boolean {
    return false;
  }

  getCorrectAnswers(): null {
    return null;
  }

  isCorrectAnswer(): boolean {
    return false; // Polls have no correct answer
  }
}
