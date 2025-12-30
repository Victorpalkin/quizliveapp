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
  if (!context) {
    // Provide more context in the error message to help debug
    const componentStack = new Error().stack;
    console.error('[useFirebase] Context is undefined. Component stack:', componentStack);
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  // Additional runtime check to catch if context is missing expected properties
  if (!context.auth || !context.firestore) {
    console.error('[useFirebase] Context is missing required properties:', {
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
