// src/firebase/firestore/use-doc.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  doc,
  DocumentReference,
  DocumentData,
  getDoc,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import {
  FirestorePermissionError,
  isFirestorePermissionError,
} from '../errors';

interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T extends DocumentData>(
  ref: DocumentReference<T> | null | undefined
) {
  const [state, setState] = useState<DocState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setState({
          data: snapshot.exists() ? snapshot.data() : null,
          loading: false,
          error: null,
        });
      },
      (err) => {
        console.error(err);

        // Classify the error based on its type
        if (isFirestorePermissionError(err)) {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setState({ data: null, loading: false, error: permissionError });
        } else {
          // For other Firestore errors, emit a generic error event
          errorEmitter.emit('firestore-error', err);
          setState({ data: null, loading: false, error: err });
        }
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return state;
}

export async function getDocServer<T extends DocumentData>(
  ref: DocumentReference<T>
): Promise<T | null> {
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}
