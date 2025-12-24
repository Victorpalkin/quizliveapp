'use client';

/**
 * Presentation Lobby Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationLobbyError({
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
      title="Lobby Error"
      message="The lobby encountered an error. Players may still be trying to join."
      footerMessage="Players already in the lobby will remain connected if you reload"
    />
  );
}
