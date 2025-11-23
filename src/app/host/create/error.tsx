'use client';

/**
 * Quiz Creator Error Boundary
 *
 * Catches errors in the quiz creation page (/host/create).
 * Similar to the editor but for creating new quizzes.
 *
 * Common error scenarios:
 * - Form state management errors
 * - Image upload failures
 * - Form validation errors
 * - Firestore write permission errors
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function QuizCreatorError({
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
      context: 'Quiz Creator Error',
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
      title="Quiz Creator Error"
      message="An error occurred while creating your quiz. Your progress may have been lost."
      primaryAction={{
        label: 'Try Again',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Go to Dashboard',
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/host';
          }
        },
      }}
      footerMessage="Consider creating smaller quizzes or try again in a few minutes"
    />
  );
}
