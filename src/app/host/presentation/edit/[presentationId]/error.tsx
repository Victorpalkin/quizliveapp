'use client';

/**
 * Presentation Editor Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationEditorError({
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
      title="Editor Error"
      message="The presentation editor encountered an error. Your changes may not have been saved."
      footerMessage="Try reloading the page to recover your work"
    />
  );
}
