'use client';

/**
 * Forgot Password Page Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function ForgotPasswordError({
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
      title="Password Reset Error"
      message="An error occurred while loading the password reset page."
      footerMessage="You can also try logging in if you remember your password"
    />
  );
}
