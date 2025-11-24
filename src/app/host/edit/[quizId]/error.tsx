'use client';

/**
 * Quiz Editor Error Boundary
 *
 * Catches errors in the quiz editor (/host/edit/[quizId]).
 * The editor handles complex forms with dynamic question arrays and image uploads.
 *
 * Common error scenarios:
 * - Complex form state management
 * - Image upload to Firebase Storage failures
 * - Large data structure rendering
 * - Permission errors for quiz ownership
 * - Form validation errors
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function QuizEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useUser();

  useEffect(() => {
    // Extract quizId from URL if available
    const quizId = typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : undefined;

    // Log the error with quiz and user context
    logError(error, {
      context: 'Quiz Editor Error',
      userId: user?.uid,
      quizId,
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
      title="Quiz Editor Error"
      message="An error occurred while editing your quiz. Your recent changes may not have been saved."
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
      footerMessage="Tip: Make smaller, incremental changes and save frequently to avoid data loss"
    />
  );
}
