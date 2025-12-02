'use client';

/**
 * Registration Page Error Boundary
 */

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function RegisterError({
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
      title="Registration Error"
      message="An error occurred while loading the registration page."
      footerMessage="Already have an account? Try logging in instead"
    />
  );
}
