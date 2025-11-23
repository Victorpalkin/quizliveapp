'use client';

/**
 * Forgot Password Page Error Boundary
 *
 * Catches errors on the forgot password page (/forgot-password).
 * Handles password reset-related rendering errors.
 *
 * Common error scenarios:
 * - Form rendering errors
 * - Firebase Auth issues
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function ForgotPasswordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logError(error, {
      context: 'Forgot Password Page Error',
      additionalInfo: {
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      variant="auth"
      title="Password Reset Error"
      message="An error occurred while loading the password reset page."
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
      footerMessage="You can also try logging in if you remember your password"
    />
  );
}
