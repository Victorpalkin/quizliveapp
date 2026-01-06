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

export function useFirebase() {
  const context = useContext(FirebaseContext);

  // Extra defensive check for production - explicit null/undefined check
  if (context === undefined || context === null) {
    console.error('[useFirebase] CRITICAL: Context is undefined/null');
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }

  // Validate context is an object with required properties
  if (typeof context !== 'object') {
    console.error('[useFirebase] CRITICAL: Context is not an object:', typeof context);
    throw new Error('Firebase context is corrupted - not an object');
  }

  // Validate context has auth property
  if (!context.auth) {
    console.error('[useFirebase] CRITICAL: Context missing auth:', {
      keys: Object.keys(context),
      hasAuth: 'auth' in context,
      authValue: context.auth,
    });
    throw new Error('Firebase context is corrupted - missing auth');
  }

  // Validate other required properties
  if (!context.firestore || !context.storage || !context.functions || !context.app) {
    console.error('[useFirebase] WARNING: Context missing some properties:', {
      hasAuth: !!context.auth,
      hasFirestore: !!context.firestore,
      hasStorage: !!context.storage,
      hasFunctions: !!context.functions,
      hasApp: !!context.app,
    });
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
