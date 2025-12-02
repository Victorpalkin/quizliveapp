'use client';

/**
 * Email Verification Page Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function VerifyEmailError({
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
      title="Email Verification Error"
      message="An error occurred while loading the email verification page."
      footerMessage="Check your email inbox for the verification link"
    />
  );
}
