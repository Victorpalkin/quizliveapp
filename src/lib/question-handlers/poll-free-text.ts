import type { PollFreeTextQuestion } from '../types';
import type { QuestionHandler } from './base';

export class PollFreeTextHandler implements QuestionHandler<PollFreeTextQuestion> {
  type = 'poll-free-text' as const;

  validateAnswer(textAnswer: any): boolean {
    if (typeof textAnswer !== 'string') return false;
    // Basic validation - actual max length check should happen in the player page
    return textAnswer.trim().length > 0 && textAnswer.length <= 2000;
  }

  calculateScore(): number {
    return 0; // Polls don't award points
  }

  getDefaultAnswer(): string {
    return '';
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
