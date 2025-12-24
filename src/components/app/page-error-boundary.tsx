'use client';

/**
 * Page Error Boundary Wrapper
 *
 * Provides automatic error logging and consistent UI for Next.js error.tsx files.
 * Extracts context from URL and logs to both console and Google Analytics.
 *
 * Usage:
 * ```tsx
 * 'use client';
 * import { PageErrorBoundary } from '@/components/app/page-error-boundary';
 *
 * export default function MyPageError({ error, reset }) {
 *   return (
 *     <PageErrorBoundary
 *       error={error}
 *       reset={reset}
 *       variant="dashboard"
 *       title="Page Error"
 *       message="Something went wrong."
 *     />
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import { ErrorFallback, ErrorVariant, ErrorFallbackProps } from './error-fallback';
import { logError } from '@/lib/error-logging';

export interface PageErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  /** Context name for logging (auto-derived from URL if not provided) */
  context?: string;
  primaryAction?: ErrorFallbackProps['primaryAction'];
  secondaryAction?: ErrorFallbackProps['secondaryAction'];
  footerMessage?: string;
}

/**
 * Extract context info from the current URL path
 */
function extractContextFromUrl(): {
  context: string;
  gameId?: string;
  quizId?: string;
} {
  if (typeof window === 'undefined') {
    return { context: 'Unknown Page' };
  }

  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);

  // Extract IDs from common URL patterns
  let gameId: string | undefined;
  let quizId: string | undefined;

  // /play/[gameId] or /host/game/[gameId] or /host/lobby/[gameId]
  const gameIndex = segments.findIndex(s => s === 'game' || s === 'lobby' || s === 'play');
  if (gameIndex !== -1 && segments[gameIndex + 1]) {
    gameId = segments[gameIndex + 1];
  }

  // /host/edit/[quizId]
  const editIndex = segments.indexOf('edit');
  if (editIndex !== -1 && segments[editIndex + 1]) {
    quizId = segments[editIndex + 1];
  }

  // Generate human-readable context from path
  const contextMap: Record<string, string> = {
    'play': 'Player Game',
    'play/presentation': 'Player Presentation',
    'join': 'Join Game',
    'host': 'Host Dashboard',
    'host/game': 'Host Game',
    'host/lobby': 'Host Lobby',
    'host/edit': 'Quiz Editor',
    'host/create': 'Quiz Creator',
    'host/create-ai': 'AI Quiz Creator',
    'host/presentation/edit': 'Presentation Editor',
    'host/presentation/create': 'Presentation Creator',
    'host/presentation/present': 'Host Presentation',
    'host/presentation/lobby': 'Presentation Lobby',
    'login': 'Login',
    'register': 'Registration',
    'forgot-password': 'Password Reset',
    'verify-email': 'Email Verification',
  };

  // Try to match path patterns (check 3-segment paths first, then 2-segment, then 1-segment)
  const pathKey3 = segments.slice(0, 3).join('/');
  const pathKey2 = segments.slice(0, 2).join('/');
  const context = contextMap[pathKey3] || contextMap[pathKey2] || contextMap[segments[0]] || 'Page';

  return { context: `${context} Error`, gameId, quizId };
}

export function PageErrorBoundary({
  error,
  reset,
  variant = 'generic',
  title,
  message,
  context: customContext,
  primaryAction,
  secondaryAction,
  footerMessage,
}: PageErrorBoundaryProps) {
  useEffect(() => {
    const { context: autoContext, gameId, quizId } = extractContextFromUrl();
    const context = customContext || autoContext;

    logError(error, {
      context,
      gameId,
      quizId,
      additionalInfo: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error, customContext]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant={variant}
      title={title}
      message={message}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      footerMessage={footerMessage}
    />
  );
}
