'use client';

/**
 * Login Page Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function LoginError({
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
      variant="auth"
      title="Login Error"
      message="An error occurred while loading the login page."
    />
  );
}
