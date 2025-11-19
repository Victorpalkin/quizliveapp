import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FirestoreErrorContext {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
}

/**
 * Handles Firestore errors with consistent logging and error emission
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
  error: any,
  context: FirestoreErrorContext,
  customMessage?: string
): void {
  const defaultMessage = `Error ${context.operation}ing resource: `;
  console.error(customMessage || defaultMessage, error);

  const permissionError = new FirestorePermissionError({
    path: context.path,
    operation: context.operation,
    requestResourceData: context.requestResourceData,
  });

  errorEmitter.emit('permission-error', permissionError);
}
