/**
 * Shared constants used across the application
 */

import type { PresentationSlideType } from './types';

/**
 * Color palette for quiz answer options
 * Used in host view, player questions, and quiz previews
 */
export const ANSWER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
] as const;

/**
 * Slide types that are interactive and support pacing.
 * Keep in sync with functions/src/functions/computePresentationAnalytics.ts
 */
export const INTERACTIVE_SLIDE_TYPES: PresentationSlideType[] = [
  'quiz',
  'poll',
  'thoughts-collect',
  'rating-input',
];
