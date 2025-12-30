// src/firebase/index.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig } from './config';
import { initializeAppCheckClient } from './app-check';
import { initAnalytics, trackEvent, trackException } from './analytics';

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
import { FirebaseClientProvider } from './client-provider';
import { useUser } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

function initializeFirebase() {
  try {
    if (getApps().length) {
      const app = getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      const storage = getStorage(app);
      const functions = getFunctions(app, 'europe-west4'); // Use europe-west4 region

      // Validate all services are initialized
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
    // This verifies requests come from your genuine app
    initializeAppCheckClient(app);

    // Initialize Analytics (lazy loaded after page is interactive)
    initAnalytics(app);

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app, 'europe-west4'); // Use europe-west4 region

    // Validate all services are initialized
    if (!auth || !firestore || !storage || !functions) {
      console.error('[Firebase] New app missing services:', {
        hasAuth: !!auth,
        hasFirestore: !!firestore,
        hasStorage: !!storage,
        hasFunctions: !!functions,
      });
    }

    // Uncomment to use local emulator
    // if (process.env.NODE_ENV === 'development') {
    //   connectFunctionsEmulator(functions, 'localhost', 5001);
    // }

    return { app, auth, firestore, storage, functions };
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw error;
  }
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
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
