'use client';

/**
 * AI Quiz Creator Error Boundary
 *
 * Catches errors in the AI quiz creation page (/host/create-ai).
 *
 * Common error scenarios:
 * - AI generation failures
 * - Network errors when calling Cloud Functions
 * - Firestore write permission errors
 */

import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { LayoutDashboard, RefreshCw } from 'lucide-react';

export default function AIQuizCreatorError({
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
      context: 'AI Quiz Creator Error',
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
      title="AI Quiz Creator Error"
      message="An error occurred while generating your quiz with AI. Please try again."
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
      footerMessage="If the issue persists, try a simpler prompt or check your connection"
    />
  );
}
