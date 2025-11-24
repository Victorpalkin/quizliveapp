import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { CreateHostAccountRequest, CreateHostAccountResult } from '../types';
import { ALLOWED_ORIGINS, REGION } from '../config';
import { validateOrigin } from '../utils/cors';
import { validateHostAccountRequest } from '../utils/validation';

/**
 * Cloud Function to create a new host account
 * Validates @google.com domain and creates user with email verification
 *
 * Security features:
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
  },
  async (request): Promise<CreateHostAccountResult> => {
    // Validate request origin
    const origin = request.rawRequest?.headers?.origin as string | undefined;
    validateOrigin(origin);

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

      // Parallel operations: Create Firestore profile and generate verification link simultaneously
      const db = admin.firestore();
      const userProfileRef = db.collection('users').doc(userRecord.uid);

      const now = admin.firestore.Timestamp.now();
      const actionCodeSettings = {
        url: `${origin || 'https://quiz.palkin.nl'}/login`, // Redirect to login after verification
        handleCodeInApp: false,
      };

      const [, verificationLink] = await Promise.all([
        userProfileRef.set({
          id: userRecord.uid,
          email: trimmedEmail,
          name: trimmedName,
          jobRole: trimmedJobRole,
          team: trimmedTeam,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        }),
        admin.auth().generateEmailVerificationLink(trimmedEmail, actionCodeSettings)
      ]);

      console.log(`[REGISTRATION] Created Firestore profile and verification link for: ${userRecord.uid}`);

      // Note: In production, you would send this link via a custom email service
      // For now, Firebase Auth will handle sending the verification email
      // when the user signs in and requests verification

      return {
        success: true,
        userId: userRecord.uid,
        message: 'Account created successfully. Please verify your email before signing in.',
        verificationLink, // Return link for development/testing purposes
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
