import type { PollSingleQuestion } from '../types';
import type { QuestionHandler } from './base';

export class PollSingleHandler implements QuestionHandler<PollSingleQuestion> {
  type = 'poll-single' as const;

  validateAnswer(answerIndex: any): boolean {
    return typeof answerIndex === 'number' && answerIndex >= 0;
  }

  calculateScore(): number {
    return 0; // Polls don't award points
  }

  getDefaultAnswer(): number {
    return -1;
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
