'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../provider';
import { sendPasswordResetEmail } from 'firebase/auth';

export function usePasswordReset() {
  const auth = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send password reset email to the specified email address
   */
  const sendPasswordReset = useCallback(async (email: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    setIsSending(true);
    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setIsSending(false);
      setError('Email is required');
      return { success: false, error: 'Email is required' };
    }

    try {
      // Send password reset email
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setIsSending(false);
      return { success: true };
    } catch (err: any) {
      console.error('[Password Reset] Error sending reset email:', err);

      let errorMessage = 'Failed to send password reset email. Please try again.';

      // Handle specific Firebase Auth errors
      if (err.code === 'auth/user-not-found') {
        // For security reasons, don't reveal if user exists or not
        // Still return success to prevent email enumeration
        setIsSending(false);
        return { success: true };
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsSending(false);

      return { success: false, error: errorMessage };
    }
  }, [auth]);

  return {
    sendPasswordReset,
    isSending,
    error,
  };
}
