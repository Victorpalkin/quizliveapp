'use client';

/**
 * Host Dashboard Error Boundary
 *
 * Catches errors in the host dashboard (/host) and all sub-routes
 * that don't have their own error.tsx file.
 *
 * Common error scenarios:
 * - Multiple Firebase queries failing (quizzes, games, shared quizzes)
 * - Complex UI with dialogs and modals
 * - Image deletion logic
 * - Permission errors
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function HostDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useUser();

  useEffect(() => {
    // Log the error with user context
    logError(error, {
      context: 'Host Dashboard Error',
      userId: user?.uid,
      additionalInfo: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error, user]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant="dashboard"
      title="Dashboard Error"
      message="Could not load your dashboard. Your quizzes and games are safe."
      primaryAction={{
        label: 'Try Again',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Go Home',
        icon: <Home className="mr-2 h-4 w-4" />,
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        },
      }}
      footerMessage="If the problem persists, try logging out and back in"
    />
  );
}
