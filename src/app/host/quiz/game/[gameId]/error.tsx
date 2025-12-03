'use client';

/**
 * Host Game Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function HostGameError({
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
      title="Game Control Error"
      message="The game encountered an error. Players may still be connected."
      footerMessage="Tip: Try opening the game in a new tab to avoid losing control"
    />
  );
}
