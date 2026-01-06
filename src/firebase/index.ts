// src/firebase/index.ts
// This is a barrel file that re-exports Firebase hooks and utilities.
// Note: FirebaseClientProvider is NOT exported here to avoid circular imports.
// Import it directly from '@/firebase/client-provider' when needed.

import { trackEvent, trackException } from './analytics';

import {
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
  useFunctions,
  FirebaseProvider,
  useMemoFirebase,
} from './provider';
import { useUser } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

export {
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
  useFunctions,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  // Analytics
  trackEvent,
  trackException,
};
