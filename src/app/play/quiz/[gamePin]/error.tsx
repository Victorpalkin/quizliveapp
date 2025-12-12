'use client';

/**
 * Player Game Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';
import { Home, RefreshCw } from 'lucide-react';

export default function PlayerGameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageErrorBoundary
      error={error}
      reset={reset}
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
