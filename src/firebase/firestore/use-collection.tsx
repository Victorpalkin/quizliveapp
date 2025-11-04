// src/firebase/firestore/use-collection.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  collection,
  Query,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface CollectionState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T extends DocumentData>(
  query: Query<T> | null | undefined
) {
  const [state, setState] = useState<CollectionState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setState({ data, loading: false, error: null });
      },
      async (err) => {
        console.error(err);
        const permissionError = new FirestorePermissionError({
          path: (query as any)._query.path.segments.join('/'),
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setState({ data: null, loading: false, error: permissionError });
      }
    );

    return () => unsubscribe();
  }, [query]);

  return state;
}
