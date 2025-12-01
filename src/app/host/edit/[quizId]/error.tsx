'use client';

/**
 * Quiz Editor Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function QuizEditorError({
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
      title="Quiz Editor Error"
      message="An error occurred while editing your quiz. Your recent changes may not have been saved."
      footerMessage="Tip: Make smaller, incremental changes and save frequently to avoid data loss"
    />
  );
}
