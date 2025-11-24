/**
 * Reusable Error Fallback Component
 *
 * Provides consistent error UI across different error boundaries.
 * Supports multiple variants for different contexts (game, dashboard, auth, etc.)
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  XCircle,
  Home,
  RefreshCw,
  LayoutDashboard,
  Info,
} from 'lucide-react';

export type ErrorVariant = 'game' | 'dashboard' | 'auth' | 'generic';

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  showDetails?: boolean;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  footerMessage?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  variant = 'generic',
  title,
  message,
  showDetails = false,
  primaryAction,
  secondaryAction,
  footerMessage,
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';

  // Default configurations by variant
  const variantConfig = {
    game: {
      icon: XCircle,
      iconColor: 'text-destructive',
      defaultTitle: 'Game Error',
      defaultMessage: 'Oops! Something went wrong with the game.',
    },
    dashboard: {
      icon: AlertTriangle,
      iconColor: 'text-warning',
      defaultTitle: 'Dashboard Error',
      defaultMessage: 'Could not load your dashboard.',
    },
    auth: {
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      defaultTitle: 'Authentication Error',
      defaultMessage: 'An error occurred during authentication.',
    },
    generic: {
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      defaultTitle: 'Something went wrong',
      defaultMessage: 'An unexpected error occurred. Please try again.',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  // Default primary action
  const defaultPrimaryAction = {
    label: 'Try Again',
    icon: <RefreshCw className="mr-2 h-4 w-4" />,
    onClick: resetErrorBoundary,
  };

  // Default secondary actions by variant
  const defaultSecondaryAction = variant === 'dashboard' || variant === 'game'
    ? {
        label: variant === 'dashboard' ? 'Go Home' : 'Exit to Home',
        icon: <Home className="mr-2 h-4 w-4" />,
        onClick: () => (window.location.href = '/'),
      }
    : variant === 'auth'
    ? {
        label: 'Go Home',
        icon: <Home className="mr-2 h-4 w-4" />,
        onClick: () => (window.location.href = '/'),
      }
    : undefined;

  const primary = primaryAction || defaultPrimaryAction;
  const secondary = secondaryAction || defaultSecondaryAction;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Icon className={`h-16 w-16 ${config.iconColor}`} />
          </div>
          <CardTitle className="text-2xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base">
            {displayMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={primary.onClick}
              className="w-full"
              size="lg"
            >
              {primary.icon}
              {primary.label}
            </Button>

            {secondary && (
              <Button
                variant="outline"
                onClick={secondary.onClick}
                className="w-full"
                size="lg"
              >
                {secondary.icon}
                {secondary.label}
              </Button>
            )}
          </div>

          {/* Footer message */}
          {footerMessage && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {footerMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Development mode error details */}
          {(isDev || showDetails) && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-mono">
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
                    <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
