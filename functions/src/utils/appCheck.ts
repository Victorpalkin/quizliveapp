import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

/**
 * App Check verification for Cloud Functions
 *
 * Firebase App Check helps protect your backend resources from abuse by
 * verifying that incoming requests come from your genuine app.
 *
 * Setup required:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app with reCAPTCHA Enterprise (web) or DeviceCheck/App Attest (mobile)
 * 3. Initialize App Check on the client with the appropriate provider
 *
 * @see https://firebase.google.com/docs/app-check
 */

// Check if App Check enforcement is enabled via environment variable
// This allows gradual rollout: monitor first, then enforce
const APP_CHECK_ENFORCEMENT = process.env.APP_CHECK_ENFORCEMENT === 'false';

/**
 * Verify App Check token from request
 *
 * @param request - The callable request object
 * @param options - Configuration options
 * @throws HttpsError if verification fails and enforcement is enabled
 */
export function verifyAppCheck(
  request: CallableRequest,
  options: {
    /** If true, allows requests without App Check (for gradual rollout) */
    allowUnverified?: boolean;
    /** Custom error message */
    errorMessage?: string;
  } = {}
): void {
  const { allowUnverified = !APP_CHECK_ENFORCEMENT, errorMessage } = options;

  // Check if App Check token is present
  const appCheckToken = request.app;

  if (!appCheckToken) {
    // No App Check token provided
    if (allowUnverified) {
      // Monitoring mode: allow but don't log every request (too verbose)
      return;
    }

    // Enforcement mode: block requests without valid token
    console.warn('[APP_CHECK] Blocked request without App Check token');
    throw new HttpsError(
      'failed-precondition',
      errorMessage || 'App Check verification failed. Please update your app.'
    );
  }

  // Token is present and was already verified by Firebase
  // No logging needed - success is the common case
}

/**
 * Check if App Check enforcement is currently enabled
 */
export function isAppCheckEnforced(): boolean {
  return APP_CHECK_ENFORCEMENT;
}
