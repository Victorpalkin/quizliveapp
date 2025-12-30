// src/firebase/client-provider.tsx
'use client';
import { ReactNode } from 'react';
import { initializeFirebase } from './';
import { FirebaseProvider } from './provider';

// This is a singleton to ensure we only initialize Firebase once.
const firebase = initializeFirebase();

// Validate at module load time to catch initialization failures early
if (!firebase) {
  console.error('[FirebaseClientProvider] Firebase initialization returned undefined');
}
if (firebase && !firebase.auth) {
  console.error('[FirebaseClientProvider] Firebase initialized without auth:', Object.keys(firebase));
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  if (!firebase) {
    throw new Error('Firebase failed to initialize - check console for details');
  }
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
