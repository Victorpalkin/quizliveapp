import type { MultipleChoiceQuestion } from '../types';
import type { QuestionHandler } from './base';
import { calculateProportionalScore } from '../scoring';

export class MultipleChoiceHandler implements QuestionHandler<MultipleChoiceQuestion> {
  type = 'multiple-choice' as const;

  validateAnswer(answerIndices: any): boolean {
    return Array.isArray(answerIndices) && answerIndices.every(i => typeof i === 'number' && i >= 0);
  }

  calculateScore(
    answerIndices: number[],
    question: MultipleChoiceQuestion,
    timeRemaining: number
  ): number {
    const correctSelected = answerIndices.filter(i =>
      question.correctAnswerIndices.includes(i)
    ).length;
    const wrongSelected = answerIndices.filter(i =>
      !question.correctAnswerIndices.includes(i)
    ).length;
    const totalCorrect = question.correctAnswerIndices.length;

    return calculateProportionalScore(
      correctSelected,
      wrongSelected,
      totalCorrect,
      timeRemaining,
      question.timeLimit || 20
    );
  }

  getDefaultAnswer(): number[] {
    return [];
  }

  hasCorrectAnswer(): boolean {
    return true;
  }

  getCorrectAnswers(question: MultipleChoiceQuestion): number[] {
    return question.correctAnswerIndices;
  }

  isCorrectAnswer(answerIndices: number[], question: MultipleChoiceQuestion): boolean {
    if (answerIndices.length !== question.correctAnswerIndices.length) {
      return false;
    }
    const sorted1 = [...answerIndices].sort();
    const sorted2 = [...question.correctAnswerIndices].sort();
    return sorted1.every((val, idx) => val === sorted2[idx]);
  }
}
