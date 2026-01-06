// src/firebase/client-provider.tsx
'use client';
import { ReactNode, useMemo } from 'react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';
import { firebaseConfig } from './config';
import { initializeAppCheckClient } from './app-check';
import { initAnalytics } from './analytics';
import { FirebaseProvider } from './provider';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

// Module-level singleton - initialized once when module loads
let firebaseInstance: FirebaseContextValue | null = null;
let initializationAttempted = false;

function getOrCreateFirebaseInstance(): FirebaseContextValue {
  if (firebaseInstance) {
    return firebaseInstance;
  }

  if (initializationAttempted) {
    throw new Error('Firebase initialization already attempted but failed');
  }

  initializationAttempted = true;

  try {
    // Check if Firebase app already exists
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // Initialize services
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app, 'europe-west4');

    // Initialize App Check and Analytics (only for newly created app)
    if (getApps().length === 1) {
      initializeAppCheckClient(app);
      initAnalytics(app);
    }

    // Validate all services are initialized
    if (!auth || !firestore || !storage || !functions) {
      console.error('[Firebase] Services validation failed:', {
        hasAuth: !!auth,
        hasFirestore: !!firestore,
        hasStorage: !!storage,
        hasFunctions: !!functions,
      });
      throw new Error('Firebase services failed to initialize');
    }

    firebaseInstance = { app, auth, firestore, storage, functions };
    return firebaseInstance;
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    throw error;
  }
}

/**
 * Simple loading spinner for Firebase initialization
 */
function FirebaseLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // Initialize SYNCHRONOUSLY during render (not in useEffect)
  // This ensures the context is available immediately on first client render
  const firebase = useMemo(() => {
    // During SSR, return null - we'll show a loading state
    if (typeof window === 'undefined') {
      return null;
    }
    return getOrCreateFirebaseInstance();
  }, []);

  // During SSR or if initialization failed, show loading
  if (!firebase) {
    return <FirebaseLoadingSpinner />;
  }

  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
