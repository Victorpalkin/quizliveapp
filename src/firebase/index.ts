// src/firebase/index.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig } from './config';

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
  if (getApps().length) {
    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    const functions = getFunctions(app, 'europe-west4'); // Use europe-west4 region
    return { app, auth, firestore, storage, functions };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, 'europe-west4'); // Use europe-west4 region

  // Uncomment to use local emulator
  // if (process.env.NODE_ENV === 'development') {
  //   connectFunctionsEmulator(functions, 'localhost', 5001);
  // }

  return { app, auth, firestore, storage, functions };
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
};
