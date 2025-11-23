'use client';

/**
 * Register Page Error Boundary
 *
 * Catches errors on the registration page (/register).
 * Handles account creation-related rendering errors.
 *
 * Common error scenarios:
 * - Form rendering errors
 * - Validation errors
 * - Firebase Auth initialization issues
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/app/error-fallback';
import { logError } from '@/lib/error-logging';
import { Home, RefreshCw } from 'lucide-react';

export default function RegisterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logError(error, {
      context: 'Register Page Error',
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
      title="Registration Error"
      message="An error occurred while loading the registration page."
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
      footerMessage="Already have an account? Try logging in instead"
    />
  );
}
