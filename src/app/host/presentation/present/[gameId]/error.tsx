'use client';

/**
 * Presentation Host Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationHostError({
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
      title="Presentation Error"
      message="The presentation encountered an error. Players may still be connected."
      footerMessage="Try reloading to reconnect to the session"
    />
  );
}
