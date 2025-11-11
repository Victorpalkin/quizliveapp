'use client';

/**
 * Environment Badge Component
 *
 * Displays a visual indicator of the current environment (dev/test)
 * to help developers and testers distinguish between environments.
 *
 * - Only shows in non-production environments
 * - Fixed position in top-right corner
 * - Bright orange color for high visibility
 */

export function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;

  // Don't show badge in production
  if (!env || env === 'production') {
    return null;
  }

  // Environment colors
  const getEnvColor = () => {
    switch (env) {
      case 'development':
      case 'dev':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'staging':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'test':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getEnvLabel = () => {
    switch (env) {
      case 'development':
      case 'dev':
        return 'DEV';
      case 'staging':
        return 'STAGING';
      case 'test':
        return 'TEST';
      default:
        return env.toUpperCase();
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          ${getEnvColor()}
          text-white
          px-3 py-1.5
          rounded-full
          text-xs
          font-bold
          shadow-lg
          border-2
          border-white
          cursor-default
          transition-all
          duration-200
        `}
        title={`Environment: ${env}`}
      >
        {getEnvLabel()}
      </div>
    </div>
  );
}
