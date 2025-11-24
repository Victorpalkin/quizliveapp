import { HttpsError } from 'firebase-functions/v2/https';
import { ALLOWED_ORIGINS } from '../config';

/**
 * Validate request origin for CORS security
 * Prevents unauthorized domains from calling our Cloud Functions
 *
 * @param origin - The origin header from the request
 * @throws HttpsError if origin is not in the allowed list
 */
export function validateOrigin(origin: string | undefined): void {
  // Allow requests with no origin (server-to-server, Firebase Admin SDK)
  if (!origin) {
    return;
  }

  // Check if origin is in allowed list
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
    throw new HttpsError(
      'permission-denied',
      'Request from unauthorized origin'
    );
  }

  // Log successful origin validation for security monitoring
  console.log(`[SECURITY] Validated request from allowed origin: ${origin}`);
}
