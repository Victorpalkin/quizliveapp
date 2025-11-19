import type {
  Question,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  Answer,
} from './types';
import { isSingleChoice, isMultipleChoice, hasAnswers } from './type-guards';

/**
 * Adjust correct answer indices after removing an answer from a question
 * Handles both single-choice and multiple-choice questions
 */
export function adjustIndicesAfterRemoval(
  question: Question,
  removedIndex: number
): Question {
  if (!hasAnswers(question)) return question;

  if (isSingleChoice(question)) {
    return {
      ...question,
      correctAnswerIndex: question.correctAnswerIndex === removedIndex
        ? 0 // Default to first answer if removed answer was correct
        : question.correctAnswerIndex > removedIndex
          ? question.correctAnswerIndex - 1
          : question.correctAnswerIndex
    };
  }

  if (isMultipleChoice(question)) {
    const newCorrectIndices = question.correctAnswerIndices
      .filter(i => i !== removedIndex)
      .map(i => i > removedIndex ? i - 1 : i);

    return {
      ...question,
      correctAnswerIndices: ensureMinimumCorrectAnswers(
        newCorrectIndices,
        question.answers.length - 1
      )
    };
  }

  return question;
}

/**
 * Ensure multiple-choice questions have at least 2 correct answers
 * Adds indices [0, 1] if needed
 */
function ensureMinimumCorrectAnswers(
  indices: number[],
  maxIndex: number
): number[] {
  if (indices.length >= 2) return indices;

  const missing = [0, 1].filter(
    i => !indices.includes(i) && i < maxIndex
  );

  return [...indices, ...missing].slice(0, 2);
}

/**
 * Validate that a question has the minimum required answers
 */
export function hasMinimumAnswers(question: Question): boolean {
  if (!hasAnswers(question)) return true; // Slides, sliders don't need answers

  return question.answers.length >= 2;
}

/**
 * Validate that answers are not empty
 */
export function hasValidAnswerText(answers: Answer[]): boolean {
  return answers.every(a => a.text && a.text.trim().length > 0);
}

/**
 * Validate question text is not empty
 */
export function hasValidQuestionText(question: Question): boolean {
  return Boolean(question.text && question.text.trim().length > 0);
}

/**
 * Get the maximum number of answers allowed for a question type
 */
export function getMaxAnswers(question: Question): number {
  if (hasAnswers(question)) return 8;
  return 0;
}

/**
 * Check if more answers can be added to a question
 */
export function canAddMoreAnswers(question: Question): boolean {
  if (!hasAnswers(question)) return false;
  return question.answers.length < getMaxAnswers(question);
}

/**
 * Check if an answer can be removed from a question
 */
export function canRemoveAnswer(question: Question): boolean {
  if (!hasAnswers(question)) return false;
  return question.answers.length > 2;
}
