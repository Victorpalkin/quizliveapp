'use client';

/**
 * Presentation Create Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationCreateError({
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
      variant="editor"
      title="Create Error"
      message="Failed to create the presentation. Please try again."
    />
  );
}
