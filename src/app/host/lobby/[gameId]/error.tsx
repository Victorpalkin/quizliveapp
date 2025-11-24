'use client';

/**
 * Host Lobby Error Boundary
 *
 * Catches errors in the game lobby (/host/lobby/[gameId]).
 * The lobby handles player joins and displays the game PIN and QR code.
 *
 * Common error scenarios:
 * - Real-time player list update failures
 * - QR code generation errors
 * - Race conditions with player joins
 * - Firestore permission errors
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function HostLobbyError({
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
      context: 'Host Lobby Error',
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
      title="Lobby Error"
      message="The lobby encountered an error. Players may still be trying to join."
      primaryAction={{
        label: 'Try Again',
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
      footerMessage="Players already in the lobby will remain connected if you reload"
    />
  );
}
