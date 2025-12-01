/**
 * CORS Configuration: Allowed origins for Cloud Function calls
 * These are the only domains that can call our Cloud Functions
 *
 * Security recommendations:
 * 1. Firebase App Check (Recommended):
 *    - Add App Check to verify requests come from your app
 *    - Prevents API abuse and unauthorized access
 *    - Setup: https://firebase.google.com/docs/app-check
 *
 * 2. Rate Limiting:
 *    - Consider implementing rate limiting per user/IP
 *    - Use Firebase Extensions or custom middleware
 *
 * 3. Environment-based configuration:
 *    - Localhost origins only included in development/emulator mode
 *    - Production deployments exclude localhost for security
 *
 * 4. Monitoring:
 *    - Set up alerts for blocked origin attempts
 *    - Monitor function invocation patterns
 *    - Use Cloud Monitoring for security events
 */

// Check if running in Firebase emulator or development environment
const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' ||
                      process.env.NODE_ENV === 'development';

// Localhost origins - only included in development
const LOCALHOST_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:9002',
  'https://localhost:3000',
];

// Production origins - always included
const PRODUCTION_ORIGINS = [
  // Cloud Run URLs
  'https://gquiz-880039882047.europe-west4.run.app',
  'https://gqzuiz-dev-f424-czsrxlt5hq-ez.a.run.app',
  'https://gqzuiz-dev-f424-986405642892.europe-west4.run.app',
  'https://gquiz-prod-3r5f-684066064060.europe-west4.run.app',
  'https://gquiz-prod-3r5f-klvaspwmka-ez.a.run.app',
  // Custom domain
  'https://quiz.palkin.nl',
];

// Combine origins based on environment
// Security: Localhost origins are excluded in production to prevent CORS attacks
export const ALLOWED_ORIGINS = isDevelopment
  ? [...LOCALHOST_ORIGINS, ...PRODUCTION_ORIGINS]
  : PRODUCTION_ORIGINS;

/**
 * Cloud Functions region
 */
export const REGION = 'europe-west4';

/**
 * Time constants
 */
export const GRACE_PERIOD_MS = 1500; // 2 second grace period for network latency
export const DEFAULT_QUESTION_TIME_LIMIT = 20; // Default time limit in seconds
