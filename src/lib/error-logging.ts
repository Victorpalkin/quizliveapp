/**
 * Centralized error logging utility
 *
 * Provides consistent error logging across the application.
 * Logs to console and sends to Google Analytics as exception events.
 */

import { trackException } from '@/firebase';

export interface ErrorContext {
  context: string;
  userId?: string;
  gameId?: string;
  quizId?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Log an error with context information
 */
export function logError(error: Error, context: ErrorContext): void {
  const timestamp = new Date().toISOString();
  const isDev = process.env.NODE_ENV === 'development';

  // Console logging (always active)
  console.error(`[${timestamp}] [${context.context}]`, {
    error: {
      name: error.name,
      message: error.message,
      stack: isDev ? error.stack : undefined,
    },
    context: {
      userId: context.userId,
      gameId: context.gameId,
      quizId: context.quizId,
      ...context.additionalInfo,
    },
  });

  // Send to Google Analytics as exception event (anonymous - no user IDs)
  const url = typeof window !== 'undefined' ? window.location.pathname : '';
  const description = `[${context.context}] ${error.name}: ${error.message} | ${url}`;
  trackException(description, false);
}

/**
 * Log a warning (non-error issues)
 */
export function logWarning(message: string, context: ErrorContext): void {
  const timestamp = new Date().toISOString();

  console.warn(`[${timestamp}] [${context.context}]`, {
    message,
    context: {
      userId: context.userId,
      gameId: context.gameId,
      quizId: context.quizId,
      ...context.additionalInfo,
    },
  });
}

/**
 * Log info messages (for debugging)
 */
export function logInfo(message: string, context: string): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${context}]`, message);
  }
}
