// src/firebase/provider.tsx
'use client';
import { createContext, useContext, ReactNode, useMemo } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

// Global key for cross-chunk singleton - uses window to avoid module duplication issues
const GLOBAL_FIREBASE_KEY = '__zivo_firebase_instance__';

/**
 * Get Firebase instance from global window object.
 * This works across all chunks even if the module is duplicated.
 */
export function getGlobalFirebaseInstance(): FirebaseContextValue | null {
  if (typeof window !== 'undefined') {
    return (window as any)[GLOBAL_FIREBASE_KEY] || null;
  }
  return null;
}

/**
 * Set Firebase instance in global window object.
 * Called by FirebaseClientProvider after initialization.
 */
export function setGlobalFirebaseInstance(instance: FirebaseContextValue): void {
  if (typeof window !== 'undefined') {
    (window as any)[GLOBAL_FIREBASE_KEY] = instance;
  }
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FirebaseContextValue;
}) {
  // Defensive validation to catch initialization issues early
  if (!value) {
    console.error('[FirebaseProvider] value is undefined');
    throw new Error('FirebaseProvider received undefined value');
  }
  if (!value.auth) {
    console.error('[FirebaseProvider] auth is undefined in value:', Object.keys(value));
    throw new Error('FirebaseProvider received value without auth');
  }

  const memoizedValue = useMemo(() => value, [value]);
  return (
    <FirebaseContext.Provider value={memoizedValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextValue {
  // FIRST: Check global singleton (works across all chunks even if module is duplicated)
  const globalInstance = getGlobalFirebaseInstance();
  if (globalInstance) {
    return globalInstance;
  }

  // FALLBACK: Try React context (for initial render before global is set)
  const context = useContext(FirebaseContext);

  if (!context) {
    console.error('[useFirebase] CRITICAL: No Firebase instance available');
    console.error('Global instance:', globalInstance);
    console.error('Context:', context);
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }

  // Validate context has required properties
  if (!context.auth || !context.firestore || !context.storage || !context.functions || !context.app) {
    console.error('[useFirebase] CRITICAL: Context missing required properties:', {
      hasAuth: !!context.auth,
      hasFirestore: !!context.firestore,
      hasStorage: !!context.storage,
      hasFunctions: !!context.functions,
      hasApp: !!context.app,
    });
    throw new Error('Firebase context is corrupted - missing required properties');
  }

  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}

export function useStorage() {
    return useFirebase().storage;
}

export function useFunctions() {
    return useFirebase().functions;
}

export function useMemoFirebase<T>(
  factory: () => T,
  deps: React.DependencyList
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
