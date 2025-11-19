import { FirebaseError } from 'firebase/app';

/**
 * Common Firebase error codes and their user-friendly messages
 */
export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',

  // Firestore errors
  'permission-denied': 'You don\'t have permission to access this resource.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This resource already exists.',
  'resource-exhausted': 'Quota exceeded. Please try again later.',
  'failed-precondition': 'Operation cannot be performed in the current state.',
  'aborted': 'Operation was aborted. Please try again.',
  'out-of-range': 'Invalid value provided.',
  'unimplemented': 'This operation is not supported yet.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'Service is temporarily unavailable. Please try again.',
  'data-loss': 'Data loss or corruption detected.',
  'unauthenticated': 'You must be logged in to perform this action.',

  // Storage errors
  'storage/unauthorized': 'You don\'t have permission to access this file.',
  'storage/canceled': 'File upload was canceled.',
  'storage/unknown': 'An unknown error occurred during file upload.',
  'storage/object-not-found': 'File not found.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/unauthenticated': 'You must be logged in to upload files.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',

  // Functions errors
  'functions/invalid-argument': 'Invalid data provided.',
  'functions/deadline-exceeded': 'Operation timed out. Please try again.',
  'functions/not-found': 'The requested function was not found.',
  'functions/permission-denied': 'You don\'t have permission to call this function.',
  'functions/unauthenticated': 'You must be logged in to perform this action.',
};

/**
 * Get a user-friendly error message from a Firebase error
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error is a Firebase permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'permission-denied' ||
           error.code === 'functions/permission-denied' ||
           error.code === 'storage/unauthorized';
  }
  return false;
}

/**
 * Check if an error is a Firebase authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code.startsWith('auth/') ||
           error.code === 'unauthenticated' ||
           error.code === 'functions/unauthenticated' ||
           error.code === 'storage/unauthenticated';
  }
  return false;
}

/**
 * Check if an error is retryable (temporary issue)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'unavailable' ||
           error.code === 'deadline-exceeded' ||
           error.code === 'functions/deadline-exceeded' ||
           error.code === 'aborted' ||
           error.code === 'resource-exhausted';
  }
  return false;
}

/**
 * Format error for logging (includes stack trace for debugging)
 */
export function formatErrorForLogging(error: unknown, context?: string): string {
  const prefix = context ? `[${context}] ` : '';

  if (error instanceof FirebaseError) {
    return `${prefix}Firebase Error: ${error.code} - ${error.message}\nStack: ${error.stack}`;
  }

  if (error instanceof Error) {
    return `${prefix}Error: ${error.message}\nStack: ${error.stack}`;
  }

  return `${prefix}Unknown error: ${JSON.stringify(error)}`;
}

/**
 * Error handler with toast notification
 * Use with try/catch blocks for consistent error handling
 */
export function handleError(
  error: unknown,
  toast: (options: { variant?: 'default' | 'destructive'; title: string; description?: string }) => void,
  context?: string
) {
  const errorMessage = getFirebaseErrorMessage(error);
  console.error(formatErrorForLogging(error, context));

  toast({
    variant: 'destructive',
    title: 'Error',
    description: errorMessage,
  });
}

/**
 * Async operation wrapper with error handling and loading state
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    onError?: (error: unknown) => void;
    onSuccess?: (result: T) => void;
    setLoading?: (loading: boolean) => void;
    toast?: (options: { variant?: 'default' | 'destructive'; title: string; description?: string }) => void;
    context?: string;
  }
): Promise<T | null> {
  const { onError, onSuccess, setLoading, toast, context } = options;

  try {
    setLoading?.(true);
    const result = await operation();
    onSuccess?.(result);
    return result;
  } catch (error) {
    if (toast) {
      handleError(error, toast, context);
    }
    onError?.(error);
    return null;
  } finally {
    setLoading?.(false);
  }
}
