'use client';

import { PageErrorBoundary } from '@/components/app/page-error-boundary';

export default function PresentationError({
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
      variant="game"
      title="Presentation Error"
      message="The presentation encountered an error. Players may still be connected."
      footerMessage="Tip: Try opening the presentation in a new tab"
    />
  );
}
