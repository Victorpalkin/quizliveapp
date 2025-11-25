// Firebase App Check initialization
// App Check helps protect your backend resources from abuse
// https://firebase.google.com/docs/app-check

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';

/**
 * Initialize Firebase App Check with reCAPTCHA Enterprise provider
 *
 * Setup requirements:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app with reCAPTCHA Enterprise
 * 3. Add the site key to environment variables
 * 4. Enable App Check enforcement in Cloud Functions when ready
 *
 * Environment variables:
 * - NEXT_PUBLIC_RECAPTCHA_SITE_KEY: Your reCAPTCHA Enterprise site key
 * - NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN: Debug token for local development (optional)
 *
 * @see https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
 */
export function initializeAppCheckClient(app: FirebaseApp): void {
  // Skip App Check in SSR context
  if (typeof window === 'undefined') {
    return;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If no site key is configured, skip App Check initialization
  // This allows the app to work without App Check during development
  if (!siteKey) {
    console.warn(
      '[App Check] No reCAPTCHA site key configured. ' +
      'Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY to enable App Check.'
    );
    return;
  }

  try {
    // Enable debug mode for local development
    // This allows testing without a real reCAPTCHA token
    if (process.env.NODE_ENV === 'development') {
      const debugToken = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
      if (debugToken) {
        // Set debug token for Firebase emulator
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
        console.log('[App Check] Debug mode enabled');
      }
    }

    // Initialize App Check with reCAPTCHA Enterprise provider
    const provider = new ReCaptchaEnterpriseProvider(siteKey);

    initializeAppCheck(app, {
      provider,
      // Set to true to refresh App Check tokens as needed
      isTokenAutoRefreshEnabled: true,
    });

    console.log('[App Check] Initialized successfully');
  } catch (error) {
    // Log error but don't crash the app
    // App Check is a security enhancement, not a hard requirement
    console.error('[App Check] Initialization failed:', error);
  }
}
