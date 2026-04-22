'use client';

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function EvaluationGameError({
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
      title="Evaluation Session Error"
      message="The evaluation session encountered an error. Players may still be connected."
      footerMessage="Tip: Try refreshing the page to reconnect to the session"
    />
  );
}
