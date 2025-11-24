'use client';

/**
 * Player Game Error Boundary
 *
 * Catches errors in the player game interface (/play/[gameId]).
 * This is a critical error boundary as the player game has complex
 * state management, real-time sync, and multiple concurrent effects.
 *
 * Common error scenarios:
 * - Real-time Firestore sync failures
 * - State machine transition errors
 * - Timer and effect race conditions
 * - Cloud Function call failures
 * - Session management issues
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function PlayerGameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Extract gameId from URL if available
    const gameId = typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : undefined;

    // Log the error with game context
    logError(error, {
      context: 'Player Game Error',
      gameId,
      additionalInfo: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant="game"
      title="Game Error"
      message="Oops! Something went wrong with the game. Your progress may have been saved."
      primaryAction={{
        label: 'Try to Reconnect',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Exit to Home',
        icon: <Home className="mr-2 h-4 w-4" />,
        onClick: () => {
          // Clear player session before navigating home
          if (typeof window !== 'undefined') {
            localStorage.removeItem('playerSession');
            window.location.href = '/';
          }
        },
      }}
      footerMessage="If this keeps happening, ask the host for a new game PIN"
    />
  );
}
