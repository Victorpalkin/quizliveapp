'use client';

/**
 * Join Page Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function JoinPageError({
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
      variant="generic"
      title="Cannot Join Game"
      message="An error occurred while loading the join page."
      footerMessage="Make sure you have a valid game PIN from the host"
    />
  );
}
