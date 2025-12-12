// src/firebase/errors.ts
import { FirestoreError } from 'firebase/firestore';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules: ${JSON.stringify(
      {
        context,
      },
      null,
      2
    )}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error message more readable in the console.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}

export type IndexErrorContext = {
  path: string;
  operation: 'get' | 'list';
  indexUrl?: string;
};

export class FirestoreIndexError extends Error {
  public context: IndexErrorContext;
  constructor(context: IndexErrorContext, originalMessage: string) {
    const message = `FirestoreError: Missing index for query on "${context.path}". ${context.indexUrl ? `Create it here: ${context.indexUrl}` : originalMessage}`;
    super(message);
    this.name = 'FirestoreIndexError';
    this.context = context;
    Object.setPrototypeOf(this, FirestoreIndexError.prototype);
  }
}

/**
 * Check if a Firestore error is a permission-denied error
 */
export function isFirestorePermissionError(error: unknown): boolean {
  if (error instanceof FirestoreError) {
    return error.code === 'permission-denied';
  }
  // Check for error message patterns (fallback)
  if (error instanceof Error) {
    return error.message.includes('permission-denied') ||
           error.message.includes('Missing or insufficient permissions');
  }
  return false;
}

/**
 * Check if a Firestore error is a missing index error
 */
export function isFirestoreIndexError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('requires an index') ||
           error.message.includes('The query requires an index');
  }
  return false;
}

/**
 * Extract index creation URL from a Firestore index error message
 */
export function extractIndexUrl(error: Error): string | undefined {
  const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s"]+/);
  return match ? match[0] : undefined;
}
