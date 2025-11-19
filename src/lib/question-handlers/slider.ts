import type { SliderQuestion } from '../types';
import type { QuestionHandler } from './base';
import { calculateSliderScore } from '../scoring';

export class SliderHandler implements QuestionHandler<SliderQuestion> {
  type = 'slider' as const;

  validateAnswer(value: any): boolean {
    return typeof value === 'number';
  }

  calculateScore(
    value: number,
    question: SliderQuestion,
    timeRemaining: number
  ): number {
    const { points } = calculateSliderScore(
      value,
      question.correctValue,
      question.minValue,
      question.maxValue,
      timeRemaining,
      question.timeLimit || 20,
      question.acceptableError
    );
    return points;
  }

  getDefaultAnswer(question: SliderQuestion): number {
    return (question.minValue + question.maxValue) / 2;
  }

  hasCorrectAnswer(): boolean {
    return true;
  }

  getCorrectAnswers(question: SliderQuestion): number {
    return question.correctValue;
  }

  isCorrectAnswer(value: number, question: SliderQuestion): boolean {
    const { isCorrect } = calculateSliderScore(
      value,
      question.correctValue,
      question.minValue,
      question.maxValue,
      0, // timeRemaining doesn't affect correctness
      question.timeLimit || 20,
      question.acceptableError
    );
    return isCorrect;
  }
}
