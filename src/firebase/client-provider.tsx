// src/firebase/client-provider.tsx
'use client';
import { ReactNode, useState, useEffect, useRef } from 'react';
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

/**
 * Initialize Firebase app and all services.
 * This function is self-contained to avoid circular import issues.
 */
function initializeFirebase(): FirebaseContextValue {
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
      throw new Error('Firebase services not properly initialized');
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
    throw new Error('Firebase services not properly initialized');
  }

  return { app, auth, firestore, storage, functions };
}

// Singleton reference - initialized lazily on first use
let firebaseInstance: FirebaseContextValue | null = null;

/**
 * Get or create the Firebase instance.
 * Uses singleton pattern to ensure only one instance exists.
 */
function getFirebaseInstance(): FirebaseContextValue {
  if (!firebaseInstance) {
    firebaseInstance = initializeFirebase();
  }
  return firebaseInstance;
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
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      const instance = getFirebaseInstance();
      setFirebase(instance);
    } catch (err) {
      console.error('[FirebaseClientProvider] Initialization failed:', err);
      setError(err instanceof Error ? err : new Error('Firebase initialization failed'));
    }
  }, []);

  // Re-throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  // Show loading state until Firebase is ready
  if (!firebase) {
    return <FirebaseLoadingSpinner />;
  }

  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
