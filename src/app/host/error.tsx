'use client';

/**
 * Host Dashboard Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function HostDashboardError({
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
      title="Dashboard Error"
      message="Could not load your dashboard. Your quizzes and games are safe."
      footerMessage="If the problem persists, try logging out and back in"
    />
  );
}
