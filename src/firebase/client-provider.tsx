// src/firebase/client-provider.tsx
'use client';
import { ReactNode } from 'react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from './config';
import { initializeAppCheckClient } from './app-check';
import { initAnalytics } from './analytics';
import { FirebaseProvider } from './provider';

/**
 * Initialize Firebase app and all services.
 * This function is self-contained to avoid circular import issues.
 */
function initializeFirebase() {
  try {
    if (getApps().length) {
      const app = getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      const storage = getStorage(app);
      const functions = getFunctions(app, 'europe-west4');

      if (!auth || !firestore || !storage || !functions) {
        console.error('[Firebase] Existing app missing services:', {
          hasAuth: !!auth,
          hasFirestore: !!firestore,
          hasStorage: !!storage,
          hasFunctions: !!functions,
        });
      }

      return { app, auth, firestore, storage, functions };
    }

    const app = initializeApp(firebaseConfig);

    // Initialize App Check for security
    initializeAppCheckClient(app);

    // Initialize Analytics (lazy loaded after page is interactive)
    initAnalytics(app);

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app, 'europe-west4');

    if (!auth || !firestore || !storage || !functions) {
      console.error('[Firebase] New app missing services:', {
        hasAuth: !!auth,
        hasFirestore: !!firestore,
        hasStorage: !!storage,
        hasFunctions: !!functions,
      });
    }

    return { app, auth, firestore, storage, functions };
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw error;
  }
}

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
