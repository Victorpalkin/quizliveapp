'use client';

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function ThoughtsPlayerError({
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
      title="Session Error"
      message="Something went wrong with the session. Try refreshing to reconnect."
    />
  );
}
