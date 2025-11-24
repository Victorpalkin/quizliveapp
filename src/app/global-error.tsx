'use client';

/**
 * Global Error Handler
 *
 * Catches errors in the root layout (app/layout.tsx).
 * This is a special error boundary that only activates for layout-level errors.
 *
 * Note: This must manually render <html> and <body> tags since the layout
 * failed to render.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error('Global error boundary (layout error):', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      },
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl">Critical Error</CardTitle>
              <CardDescription className="text-base">
                A critical error occurred while loading the application.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => reset()}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                  size="lg"
                >
                  Reload Page
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                If this problem persists, please clear your browser cache and cookies.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="font-bold mb-1">Error Details (Dev Mode):</div>
                  <div className="mb-1">
                    <strong>Name:</strong> {error.name}
                  </div>
                  <div className="mb-1">
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:underline">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto max-h-48 bg-white p-2 rounded">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
