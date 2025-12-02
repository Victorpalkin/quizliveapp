'use client';

/**
 * Root Error Boundary
 *
 * Catches all unhandled errors in the application that aren't caught
 * by more specific error boundaries in child routes.
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function Error({
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
      context="Root Error Boundary"
      title="Something went wrong"
      message="An unexpected error occurred. Please try refreshing the page."
      footerMessage="If this problem persists, try clearing your browser cache or contact support."
    />
  );
}
