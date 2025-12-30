import type {
  Question,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  FreeResponseQuestion,
  Answer,
  PresentationSlide,
} from './types';
import { isSingleChoice, isMultipleChoice, hasAnswers } from './type-guards';

// ============================================
// Answer Key Utilities (for server-side scoring)
// ============================================

/**
 * Answer key entry type - contains correct answer info for server-side scoring.
 */
export interface AnswerKeyEntry {
  type: string;
  timeLimit: number;
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
  correctValue?: number;
  minValue?: number;
  maxValue?: number;
  acceptableError?: number;
  correctAnswer?: string;
  alternativeAnswers?: string[];
  caseSensitive?: boolean;
  allowTypos?: boolean;
}

// Poll questions have no time limit - use a high value that matches client's INFINITE_TIME_LIMIT
const INFINITE_TIME_LIMIT = 99999;

/**
 * Extracts answer key data from a question (for server-side scoring).
 * This data is stored securely and never sent to players.
 */
export function extractAnswerKeyEntry(q: Question): AnswerKeyEntry {
  const isPollType = ['poll-single', 'poll-multiple', 'poll-free-text'].includes(q.type);
  const base = {
    type: q.type,
    timeLimit: isPollType ? INFINITE_TIME_LIMIT : (q.timeLimit || 20),
  };

  switch (q.type) {
    case 'single-choice':
      return { ...base, correctAnswerIndex: (q as SingleChoiceQuestion).correctAnswerIndex };
    case 'multiple-choice':
      return { ...base, correctAnswerIndices: (q as MultipleChoiceQuestion).correctAnswerIndices };
    case 'slider':
      return {
        ...base,
        correctValue: (q as SliderQuestion).correctValue,
        minValue: (q as SliderQuestion).minValue,
        maxValue: (q as SliderQuestion).maxValue,
        acceptableError: (q as SliderQuestion).acceptableError,
      };
    case 'free-response':
      return {
        ...base,
        correctAnswer: (q as FreeResponseQuestion).correctAnswer,
        alternativeAnswers: (q as FreeResponseQuestion).alternativeAnswers,
        caseSensitive: (q as FreeResponseQuestion).caseSensitive,
        allowTypos: (q as FreeResponseQuestion).allowTypos,
      };
    default:
      // Polls and slides don't have correct answers
      return base;
  }
}

/**
 * Extracts answer key data from a presentation slide.
 * For quiz/poll slides, uses the embedded question.
 * For other slides, returns minimal type info.
 */
export function extractSlideAnswerKeyEntry(slide: PresentationSlide): AnswerKeyEntry {
  if ((slide.type === 'quiz' || slide.type === 'poll') && slide.question) {
    return extractAnswerKeyEntry(slide.question);
  }
  // Non-scorable slides (content, thoughts, rating, etc.)
  return { type: slide.type, timeLimit: 0 };
}

/**
 * Creates a sanitized version of a question with correct answers removed.
 * This is safe to send to players.
 */
export function sanitizeQuestionForPlayer(q: Question): Question {
  switch (q.type) {
    case 'single-choice': {
      const { correctAnswerIndex, ...rest } = q as SingleChoiceQuestion;
      return rest as Question;
    }
    case 'multiple-choice': {
      const { correctAnswerIndices, ...rest } = q as MultipleChoiceQuestion;
      // Add expectedAnswerCount for UX (tells player how many to select)
      return { ...rest, expectedAnswerCount: correctAnswerIndices.length } as unknown as Question;
    }
    case 'slider': {
      const { correctValue, acceptableError, ...rest } = q as SliderQuestion;
      return rest as Question;
    }
    case 'free-response': {
      const { correctAnswer, alternativeAnswers, caseSensitive, allowTypos, ...rest } = q as FreeResponseQuestion;
      return rest as Question;
    }
    default:
      // Slides and polls have no secret data
      return q;
  }
}

// ============================================
// Question Editing Utilities
// ============================================

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
