'use client';

/**
 * Join Page Error Boundary
 *
 * Catches errors on the player join page (/join).
 * This is the entry point for players to join games.
 *
 * Common error scenarios:
 * - Form rendering errors
 * - Firestore query failures
 * - Navigation errors
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function JoinPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logError(error, {
      context: 'Join Page Error',
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
      variant="generic"
      title="Cannot Join Game"
      message="An error occurred while loading the join page."
      primaryAction={{
        label: 'Try Again',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Go Home',
        icon: <Home className="mr-2 h-4 w-4" />,
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        },
      }}
      footerMessage="Make sure you have a valid game PIN from the host"
    />
  );
}
