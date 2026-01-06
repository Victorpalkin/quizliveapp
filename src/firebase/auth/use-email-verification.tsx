'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../provider';
import { sendEmailVerification, reload } from 'firebase/auth';

export function useEmailVerification() {
  const auth = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send email verification to the current user
   */
  const sendVerification = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setIsSending(true);
    setError(null);

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setIsSending(false);
      setError('No user is currently signed in');
      return { success: false, error: 'No user is currently signed in' };
    }

    if (currentUser.emailVerified) {
      setIsSending(false);
      return { success: true };
    }

    try {
      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setIsSending(false);
      return { success: true };
    } catch (err: any) {
      console.error('[Email Verification] Error sending verification:', err);

      let errorMessage = 'Failed to send verification email. Please try again.';

      if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsSending(false);

      return { success: false, error: errorMessage };
    }
  }, [auth]);

  /**
   * Check if the current user's email is verified
   * Reloads user data from Firebase to get latest verification status
   */
  const checkVerification = useCallback(async (): Promise<{
    verified: boolean;
    error?: string;
  }> => {
    setIsChecking(true);
    setError(null);

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setIsChecking(false);
      setError('No user is currently signed in');
      return { verified: false, error: 'No user is currently signed in' };
    }

    try {
      // Reload user data to get latest verification status
      await reload(currentUser);

      setIsChecking(false);
      return { verified: currentUser.emailVerified };
    } catch (err: any) {
      console.error('[Email Verification] Error checking verification:', err);

      let errorMessage = 'Failed to check verification status. Please try again.';

      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsChecking(false);

      return { verified: false, error: errorMessage };
    }
  }, [auth]);

  return {
    sendVerification,
    checkVerification,
    isSending,
    isChecking,
    error,
  };
}
