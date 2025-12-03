'use client';

/**
 * Quiz Creator Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function QuizCreatorError({
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
      title="Quiz Creator Error"
      message="An error occurred while creating your quiz. Your progress may have been lost."
      footerMessage="Consider creating smaller quizzes or try again in a few minutes"
    />
  );
}
