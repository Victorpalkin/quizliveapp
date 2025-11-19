import type { Question } from '../types';
import type { QuestionHandler } from './base';
import { SingleChoiceHandler } from './single-choice';
import { MultipleChoiceHandler } from './multiple-choice';
import { SliderHandler } from './slider';
import { SlideHandler } from './slide';
import { PollSingleHandler } from './poll-single';
import { PollMultipleHandler } from './poll-multiple';

// Create singleton instances of all handlers
const handlers = {
  'single-choice': new SingleChoiceHandler(),
  'multiple-choice': new MultipleChoiceHandler(),
  'slider': new SliderHandler(),
  'slide': new SlideHandler(),
  'poll-single': new PollSingleHandler(),
  'poll-multiple': new PollMultipleHandler(),
} as const;

/**
 * Get the appropriate handler for a question type
 * @throws Error if question type is not supported
 */
export function getQuestionHandler<T extends Question>(
  question: T
): QuestionHandler<T> {
  const handler = handlers[question.type];
  if (!handler) {
    throw new Error(`No handler found for question type: ${question.type}`);
  }
  return handler as QuestionHandler<T>;
}

/**
 * Get handler by type string (useful for factory patterns)
 */
export function getHandlerByType(
  type: Question['type']
): QuestionHandler<any> {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No handler found for question type: ${type}`);
  }
  return handler;
}

/**
 * Get all available question type handlers
 */
export function getAllHandlers(): QuestionHandler<any>[] {
  return Object.values(handlers);
}

/**
 * Get all available question types
 */
export function getAvailableQuestionTypes(): Question['type'][] {
  return Object.keys(handlers) as Question['type'][];
}
