import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
  FirestoreIndexError,
  isFirestorePermissionError,
  isFirestoreIndexError,
  extractIndexUrl,
} from '@/firebase/errors';

interface FirestoreErrorContext {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
}

/**
 * Handles Firestore errors with consistent logging and error emission
 *
 * Properly classifies errors into:
 * - Permission errors (security rules violations)
 * - Index errors (missing composite indexes)
 * - Generic Firestore errors (network issues, etc.)
 *
 * @param error - The error object from the failed operation
 * @param context - Context about the operation (path, operation type, data)
 * @param customMessage - Optional custom console error message (defaults to "Error {operation}ing resource")
 *
 * @example
 * deleteDoc(gameRef)
 *   .catch(error => handleFirestoreError(error, {
 *     path: gameRef.path,
 *     operation: 'delete'
 *   }))
 */
export function handleFirestoreError(
  error: unknown,
  context: FirestoreErrorContext,
  customMessage?: string
): void {
  const defaultMessage = `Error ${context.operation}ing resource: `;
  console.error(customMessage || defaultMessage, error);

  // Classify the error based on its type
  if (isFirestoreIndexError(error)) {
    const indexError = new FirestoreIndexError(
      {
        path: context.path,
        operation: context.operation as 'get' | 'list',
        indexUrl: error instanceof Error ? extractIndexUrl(error) : undefined,
      },
      error instanceof Error ? error.message : String(error)
    );
    errorEmitter.emit('index-error', indexError);
  } else if (isFirestorePermissionError(error)) {
    const permissionError = new FirestorePermissionError({
      path: context.path,
      operation: context.operation,
      requestResourceData: context.requestResourceData,
    });
    errorEmitter.emit('permission-error', permissionError);
  } else {
    // For other errors, emit as generic Firestore error
    const genericError = error instanceof Error ? error : new Error(String(error));
    errorEmitter.emit('firestore-error', genericError);
  }
}
