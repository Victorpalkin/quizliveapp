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
 *    - Store allowed origins in environment variables
 *    - Use different configs for dev/staging/prod
 *
 * 4. Monitoring:
 *    - Set up alerts for blocked origin attempts
 *    - Monitor function invocation patterns
 *    - Use Cloud Monitoring for security events
 */
export const ALLOWED_ORIGINS = [
  'http://localhost:3000',           // Local development
  'http://localhost:3001',           // Alternative local port
  'https://localhost:3000',          // Local HTTPS
  // Cloud Run URLs - Update these after deployment
  'https://gquiz-880039882047.europe-west4.run.app',
  'https://gqzuiz-dev-f424-czsrxlt5hq-ez.a.run.app',
  'https://gqzuiz-dev-f424-986405642892.europe-west4.run.app',
  'https://gquiz-prod-3r5f-684066064060.europe-west4.run.app',
  'https://gquiz-prod-3r5f-klvaspwmka-ez.a.run.app',
  'https://quiz.palkin.nl'
  // Example: 'https://gquiz-abc123-ew.a.run.app'
  // Note: You can get the actual URL after first deployment via:
  // gcloud run services describe gquiz --region=europe-west4 --format='value(status.url)'
];

/**
 * Cloud Functions region
 */
export const REGION = 'europe-west4';

/**
 * Time constants
 */
export const GRACE_PERIOD_MS = 2000; // 2 second grace period for network latency
export const DEFAULT_QUESTION_TIME_LIMIT = 20; // Default time limit in seconds
