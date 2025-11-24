'use client';

/**
 * Root Error Boundary
 *
 * Catches all unhandled errors in the application that aren't caught
 * by more specific error boundaries in child routes.
 *
 * This is the last line of defense before the app crashes completely.
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logError(error, {
      context: 'Root Error Boundary',
      additionalInfo: {
        digest: error.digest,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant="generic"
      title="Something went wrong"
      message="An unexpected error occurred. Please try refreshing the page."
      footerMessage="If this problem persists, try clearing your browser cache or contact support."
    />
  );
}
