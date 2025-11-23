'use client';

/**
 * Verify Email Page Error Boundary
 *
 * Catches errors on the email verification page (/verify-email).
 * Handles email verification-related rendering errors.
 *
 * Common error scenarios:
 * - Firebase Auth issues
 * - Email sending errors
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function VerifyEmailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logError(error, {
      context: 'Verify Email Page Error',
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
      title="Email Verification Error"
      message="An error occurred while loading the email verification page."
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
      footerMessage="Check your email inbox for the verification link"
    />
  );
}
