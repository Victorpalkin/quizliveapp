'use client';

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
      variant="game"
      title="Presentation Error"
      message="Something went wrong with the presentation. Try refreshing to reconnect."
    />
  );
}
