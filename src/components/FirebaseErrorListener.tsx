// src/components/FirebaseErrorListener.tsx
'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, FirestoreIndexError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In a dev environment, Next.js error overlay will catch this.
      // In production, you might want to log this to a service.
      throw error;
    };

    const handleIndexError = (error: FirestoreIndexError) => {
      // Index errors are development-time issues - log prominently but don't throw
      // as they're configuration issues, not runtime errors
      console.error(
        '%c⚠️ MISSING FIRESTORE INDEX',
        'background: #ff9800; color: white; padding: 4px 8px; font-weight: bold;',
        '\n\nQuery path:', error.context.path,
        '\n\nTo fix this, either:',
        '\n1. Click the link in the error message to create the index in Firebase Console',
        '\n2. Add the index to firestore.indexes.json and deploy with: firebase deploy --only firestore:indexes',
        error.context.indexUrl ? `\n\nCreate index: ${error.context.indexUrl}` : ''
      );
      // In development, throw to show the error overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    const handleFirestoreError = (error: Error) => {
      // Generic Firestore errors - log them
      console.error('Firestore error:', error);
      // Don't throw for generic errors - let the component handle the error state
    };

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('index-error', handleIndexError);
    errorEmitter.on('firestore-error', handleFirestoreError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('index-error', handleIndexError);
      errorEmitter.off('firestore-error', handleFirestoreError);
    };
  }, []);

  return null;
}
