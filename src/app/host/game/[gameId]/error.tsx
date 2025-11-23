'use client';

/**
 * Host Game Error Boundary
 *
 * Catches errors in the host game view (/host/game/[gameId]).
 * This is a critical error boundary as the host controls the game flow
 * and affects all connected players.
 *
 * Common error scenarios:
 * - Real-time player monitoring failures
 * - Game state management errors
 * - Timer logic failures
 * - Answer distribution calculation errors
 * - Image rendering from Firebase Storage issues
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function HostGameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useUser();

  useEffect(() => {
    // Extract gameId from URL if available
    const gameId = typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : undefined;

    // Log the error with game and user context
    logError(error, {
      context: 'Host Game Error',
      userId: user?.uid,
      gameId,
      additionalInfo: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error, user]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant="game"
      title="Game Control Error"
      message="The game encountered an error. Players may still be connected."
      primaryAction={{
        label: 'Reload Game View',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Go to Dashboard',
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/host';
          }
        },
      }}
      footerMessage="Tip: Try opening the game in a new tab to avoid losing control"
    />
  );
}
