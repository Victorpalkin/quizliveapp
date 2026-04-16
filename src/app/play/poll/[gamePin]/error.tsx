'use client';

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PollPlayerError({
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
      title="Poll Error"
      message="Something went wrong with the poll. Try refreshing to reconnect."
    />
  );
}
