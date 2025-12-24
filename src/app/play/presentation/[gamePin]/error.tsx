'use client';

/**
 * Presentation Player Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationPlayerError({
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
      variant="player"
      title="Player Error"
      message="Something went wrong. Try reloading to rejoin the presentation."
      footerMessage="Your previous answers have been saved"
    />
  );
}
