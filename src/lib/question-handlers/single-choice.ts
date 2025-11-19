import type { SingleChoiceQuestion } from '../types';
import type { QuestionHandler } from './base';
import { calculateTimeBasedScore } from '../scoring';

export class SingleChoiceHandler implements QuestionHandler<SingleChoiceQuestion> {
  type = 'single-choice' as const;

  validateAnswer(answerIndex: any): boolean {
    return typeof answerIndex === 'number' && answerIndex >= 0;
  }

  calculateScore(
    answerIndex: number,
    question: SingleChoiceQuestion,
    timeRemaining: number
  ): number {
    const isCorrect = answerIndex === question.correctAnswerIndex;
    return calculateTimeBasedScore(
      isCorrect,
      timeRemaining,
      question.timeLimit || 20
    );
  }

  getDefaultAnswer(): number {
    return -1; // -1 indicates no answer selected
  }

  hasCorrectAnswer(): boolean {
    return true;
  }

  getCorrectAnswers(question: SingleChoiceQuestion): number[] {
    return [question.correctAnswerIndex];
  }

  isCorrectAnswer(answerIndex: number, question: SingleChoiceQuestion): boolean {
    return answerIndex === question.correctAnswerIndex;
  }
}
