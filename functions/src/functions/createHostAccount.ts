import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { CreateHostAccountRequest, CreateHostAccountResult } from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { verifyAppCheck } from '../utils/appCheck';
import { enforceRateLimitInMemory, getClientIp } from '../utils/rateLimit';
import { validateHostAccountRequest } from '../utils/validation';

/**
 * Cloud Function to create a new host account
 * Validates @google.com domain and creates user with email verification
 *
 * Security features:
 * - App Check: Verifies requests come from genuine app instances
 * - Rate limiting: In-memory, 5 requests/hour per IP (zero latency overhead)
 * - Server-side @google.com domain validation
 * - Email uniqueness check
 * - Password validation by Firebase Auth
 * - Email verification required before access
 * - CORS validation for authorized origins only
 */
export const createHostAccount = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 5,
    concurrency: 40,
    // Enable App Check enforcement when ready
    enforceAppCheck: false, // Set to true after client-side App Check is configured
  },
  async (request): Promise<CreateHostAccountResult> => {
    // Verify App Check token (currently in monitoring mode)
    verifyAppCheck(request);

    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

    // Rate limiting: 5 requests per hour per IP (prevent account creation abuse)
    // Uses in-memory rate limiting for zero latency overhead
    const clientIp = getClientIp(request);
    enforceRateLimitInMemory(clientIp, 5, 3600); // 5 requests per hour

    const data = request.data as CreateHostAccountRequest;
    const { email, password, name, jobRole, team } = data;

    // Validate and sanitize input
    const { trimmedEmail, trimmedName, trimmedJobRole, trimmedTeam } =
      validateHostAccountRequest(email, password, name, jobRole, team);

    try {
      // Check if user already exists with this email
      try {
        const existingUser = await admin.auth().getUserByEmail(trimmedEmail);
        if (existingUser) {
          throw new HttpsError(
            'already-exists',
            'An account with this email already exists'
          );
        }
      } catch (error: any) {
        // getUserByEmail throws error if user not found - this is expected
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // User not found - good, we can proceed
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: trimmedEmail,
        password: password,
        displayName: trimmedName,
        emailVerified: false, // Require email verification
      });

      console.log(`[REGISTRATION] Created Firebase Auth user: ${userRecord.uid} (${trimmedEmail})`);

      // Create Firestore profile
      // Note: Verification email is sent from the client after sign-in using sendEmailVerification()
      const db = admin.firestore();
      const userProfileRef = db.collection('users').doc(userRecord.uid);

      const now = admin.firestore.Timestamp.now();

      await userProfileRef.set({
        id: userRecord.uid,
        email: trimmedEmail,
        name: trimmedName,
        jobRole: trimmedJobRole,
        team: trimmedTeam,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[REGISTRATION] Created Firestore profile for: ${userRecord.uid}`);

      return {
        success: true,
        userId: userRecord.uid,
        message: 'Account created successfully. Please check your email for a verification link.',
      };

    } catch (error: any) {
      console.error('[REGISTRATION] Error creating host account:', error);

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError(
          'already-exists',
          'An account with this email already exists'
        );
      }

      if (error.code === 'auth/invalid-password') {
        throw new HttpsError(
          'invalid-argument',
          'Password must be at least 6 characters'
        );
      }

      if (error.code === 'auth/invalid-email') {
        throw new HttpsError(
          'invalid-argument',
          'Invalid email address format'
        );
      }

      // Wrap other errors
      throw new HttpsError(
        'internal',
        'An error occurred while creating your account. Please try again.'
      );
    }
  }
);
