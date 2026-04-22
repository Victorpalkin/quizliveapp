'use client';

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function EvaluationPlayerError({
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
      title="Evaluation Error"
      message="Something went wrong with the evaluation. Try refreshing to reconnect."
    />
  );
}
