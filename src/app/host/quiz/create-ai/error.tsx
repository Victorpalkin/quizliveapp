'use client';

/**
 * AI Quiz Creator Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function AIQuizCreatorError({
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
      variant="dashboard"
      title="AI Quiz Creator Error"
      message="An error occurred while generating your quiz with AI. Please try again."
      footerMessage="If the issue persists, try a simpler prompt or check your connection"
    />
  );
}
