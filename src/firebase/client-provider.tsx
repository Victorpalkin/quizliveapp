// src/firebase/client-provider.tsx
'use client';
import { ReactNode, useState, useEffect } from 'react';
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

// Module-level singleton - stable reference across re-renders
let firebaseInstance: FirebaseContextValue | null = null;

function getOrCreateFirebaseInstance(): FirebaseContextValue {
  if (firebaseInstance) {
    return firebaseInstance;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, 'europe-west4');

  // Initialize App Check and Analytics for newly created app
  if (getApps().length === 1) {
    initializeAppCheckClient(app);
    initAnalytics(app);
  }

  if (!auth || !firestore || !storage || !functions) {
    console.error('[Firebase] Service initialization failed');
    throw new Error('Firebase services failed to initialize');
  }

  firebaseInstance = { app, auth, firestore, storage, functions };
  return firebaseInstance;
}

function FirebaseLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // Hydration-safe: state starts false on both server and client
  const [hydrated, setHydrated] = useState(false);
  const [firebase, setFirebase] = useState<FirebaseContextValue | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This only runs on client after hydration
    try {
      const instance = getOrCreateFirebaseInstance();
      setFirebase(instance);
      setHydrated(true);
    } catch (err) {
      console.error('[FirebaseClientProvider] Initialization error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setHydrated(true);
    }
  }, []);

  // During SSR and first client render: show loading (matches on both)
  if (!hydrated) {
    return <FirebaseLoadingSpinner />;
  }

  // After hydration: show error if initialization failed
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center text-red-600">
          <p className="font-semibold">Failed to initialize</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // After hydration: if somehow firebase is null, show loading
  if (!firebase) {
    return <FirebaseLoadingSpinner />;
  }

  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
