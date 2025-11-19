import type { SlideQuestion } from '../types';
import type { QuestionHandler } from './base';

export class SlideHandler implements QuestionHandler<SlideQuestion> {
  type = 'slide' as const;

  validateAnswer(): boolean {
    return true; // Slides don't require answers
  }

  calculateScore(): number {
    return 0; // Slides don't award points
  }

  getDefaultAnswer(): null {
    return null;
  }

  hasCorrectAnswer(): boolean {
    return false;
  }

  getCorrectAnswers(): null {
    return null;
  }

  isCorrectAnswer(): boolean {
    return false; // Slides have no correct answer
  }
}
