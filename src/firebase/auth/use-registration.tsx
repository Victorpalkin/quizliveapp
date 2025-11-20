'use client';

import { useState, useCallback } from 'react';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { validateEmailDomain } from '@/lib/validation';

interface RegistrationData {
  email: string;
  password: string;
  name: string;
  jobRole: string;
  team: string;
}

interface CreateHostAccountResponse {
  success: boolean;
  userId: string;
  message: string;
  verificationLink?: string; // For development/testing
}

export function useRegistration() {
  const functions = useFunctions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Client-side email domain validation
   * Provides immediate feedback without calling Cloud Function
   */
  const validateEmail = useCallback((email: string): { valid: boolean; error?: string } => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return { valid: false, error: 'Email is required' };
    }

    if (!validateEmailDomain(trimmedEmail)) {
      return { valid: false, error: 'Only @google.com email addresses are allowed' };
    }

    return { valid: true };
  }, []);

  /**
   * Register a new host account
   * Calls Cloud Function which validates and creates the account
   */
  const register = useCallback(async (data: RegistrationData): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    // Client-side validation before calling Cloud Function
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      setIsLoading(false);
      setError(emailValidation.error!);
      return { success: false, error: emailValidation.error };
    }

    try {
      const createHostAccountFn = httpsCallable<RegistrationData, CreateHostAccountResponse>(
        functions,
        'createHostAccount'
      );

      const result = await createHostAccountFn(data);
      const { success, userId, message } = result.data;

      setIsLoading(false);

      if (success) {
        return { success: true, userId };
      } else {
        setError(message);
        return { success: false, error: message };
      }
    } catch (err: any) {
      console.error('[Registration] Error:', err);

      let errorMessage = 'An error occurred during registration. Please try again.';

      // Handle specific Firebase Function errors
      if (err.code === 'functions/invalid-argument') {
        errorMessage = err.message || 'Invalid registration data. Please check your input.';
      } else if (err.code === 'functions/already-exists') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'functions/permission-denied') {
        errorMessage = 'Registration is currently unavailable. Please try again later.';
      } else if (err.code === 'functions/internal') {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsLoading(false);

      return { success: false, error: errorMessage };
    }
  }, [functions, validateEmail]);

  return {
    register,
    validateEmail,
    isLoading,
    error,
  };
}
