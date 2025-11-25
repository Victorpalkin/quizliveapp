/**
 * Configuration for AI Cloud Functions
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
export const ALLOWED_ORIGINS = isDevelopment
  ? [...LOCALHOST_ORIGINS, ...PRODUCTION_ORIGINS]
  : PRODUCTION_ORIGINS;

/**
 * Cloud Functions region
 */
export const REGION = 'europe-west4';

/**
 * Gemini model configuration
 */
export const GEMINI_MODEL = 'gemini-3-pro-preview';

/**
 * Service account for AI functions
 * This service account has Vertex AI User role for calling Gemini API
 * Format: {name}@{project-id}.iam.gserviceaccount.com
 *
 * The service account is created during deployment with name: 'gquiz-ai-functions'
 * It only needs: roles/aiplatform.user
 */
export const AI_SERVICE_ACCOUNT = process.env.GCLOUD_PROJECT
  ? `gquiz-ai-functions@${process.env.GCLOUD_PROJECT}.iam.gserviceaccount.com`
  : `gquiz-ai-functions@${process.env.GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com`;

/**
 * Rate limiting for AI functions (more restrictive than game functions)
 */
export const AI_RATE_LIMIT = {
  maxRequests: 20,      // Max requests per window
  windowMs: 60 * 60 * 1000,  // 1 hour window
};
