'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { useUser } from '../auth/use-user';
import { Presentation, PresentationSlide } from '@/lib/types';

/**
 * Hook to get a single presentation by ID
 */
export function usePresentation(presentationId: string | null | undefined) {
  const firestore = useFirestore();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const presentationRef = useMemo(() => {
    if (!firestore || !presentationId) return null;
    return doc(firestore, 'presentations', presentationId) as DocumentReference<Presentation>;
  }, [firestore, presentationId]);

  useEffect(() => {
    if (!presentationRef) {
      setPresentation(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      presentationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setPresentation({ ...snapshot.data(), id: snapshot.id } as Presentation);
        } else {
          setPresentation(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching presentation:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [presentationRef]);

  return { presentation, loading, error, presentationRef };
}

/**
 * Hook to get all presentations for the current user
 */
export function usePresentations() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !user) {
      setPresentations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const presentationsQuery = query(
      collection(firestore, 'presentations'),
      where('hostId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      presentationsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Presentation[];
        setPresentations(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching presentations:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  return { presentations, loading, error };
}

/**
 * Hook to create, update, and delete presentations
 */
export function usePresentationMutations() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPresentation = useCallback(
    async (data: Partial<Omit<Presentation, 'id' | 'hostId' | 'createdAt' | 'updatedAt'>>) => {
      if (!firestore || !user) throw new Error('Not authenticated');

      setIsLoading(true);
      setError(null);

      try {
        const presentationData = {
          title: data.title || 'Untitled Presentation',
          description: data.description || '',
          slides: data.slides || [],
          hostId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(
          collection(firestore, 'presentations'),
          presentationData
        );

        return docRef.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create presentation');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [firestore, user]
  );

  const updatePresentation = useCallback(
    async (presentationId: string, data: Partial<Omit<Presentation, 'id' | 'hostId' | 'createdAt'>>) => {
      if (!firestore) throw new Error('Firestore not initialized');

      setIsLoading(true);
      setError(null);

      try {
        const presentationRef = doc(firestore, 'presentations', presentationId);
        await updateDoc(presentationRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update presentation');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [firestore]
  );

  const deletePresentation = useCallback(
    async (presentationId: string) => {
      if (!firestore) throw new Error('Firestore not initialized');

      setIsLoading(true);
      setError(null);

      try {
        const presentationRef = doc(firestore, 'presentations', presentationId);
        await deleteDoc(presentationRef);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete presentation');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [firestore]
  );

  const updateSlides = useCallback(
    async (presentationId: string, slides: PresentationSlide[]) => {
      return updatePresentation(presentationId, { slides });
    },
    [updatePresentation]
  );

  return {
    createPresentation,
    updatePresentation,
    deletePresentation,
    updateSlides,
    isLoading,
    error,
  };
}
