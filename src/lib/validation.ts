/**
 * Validation utilities for registration and authentication
 */

/**
 * Validates that an email has a @google.com domain
 */
export function validateEmailDomain(email: string): boolean {
  const trimmedEmail = email.trim().toLowerCase();
  return trimmedEmail.endsWith('@google.com');
}

/**
 * Password strength calculation
 * Returns a score from 0-4:
 * 0 = very weak
 * 1 = weak
 * 2 = fair
 * 3 = good
 * 4 = strong
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  // Calculate score based on criteria met
  let score = 0;
  if (minLength) score++;
  if (hasUppercase) score++;
  if (hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecialChar) score++;

  // Adjust score for very short passwords
  if (password.length < 6) {
    score = 0;
  } else if (password.length < 8) {
    score = Math.min(score, 1);
  }

  // Generate feedback
  let feedback = '';
  if (score === 0) {
    feedback = 'Very weak - password too short';
  } else if (score === 1) {
    feedback = 'Weak - add more variety';
  } else if (score === 2) {
    feedback = 'Fair - consider adding more character types';
  } else if (score === 3) {
    feedback = 'Good password';
  } else {
    feedback = 'Strong password';
  }

  return {
    score,
    feedback,
    hasMinLength: minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}

/**
 * Validates that two passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}
