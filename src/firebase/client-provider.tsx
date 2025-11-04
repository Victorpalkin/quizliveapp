// src/firebase/client-provider.tsx
'use client';
import { ReactNode } from 'react';
import { initializeFirebase } from './';
import { FirebaseProvider } from './provider';

// This is a singleton to ensure we only initialize Firebase once.
const firebase = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
