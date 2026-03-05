'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { removeUndefined } from '@/lib/firestore-utils';
import type {
  Presentation,
  PresentationSlide,
  PresentationSettings,
  PresentationTheme,
} from '@/lib/types';

const DEFAULT_SETTINGS: PresentationSettings = {
  enableReactions: true,
  enableQA: true,
  enableStreaks: true,
  enableSoundEffects: true,
  defaultTimerSeconds: 20,
  pacingMode: 'free',
  pacingThreshold: 80,
};

const DEFAULT_THEME: PresentationTheme = {
  preset: 'default',
};

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function docToPresentation(id: string, data: Record<string, unknown>): Presentation {
  return {
    id,
    title: (data.title as string) || 'Untitled Presentation',
    description: data.description as string | undefined,
    hostId: data.hostId as string,
    slides: (data.slides as PresentationSlide[]) || [],
    settings: (data.settings as PresentationSettings) || { ...DEFAULT_SETTINGS },
    theme: (data.theme as PresentationTheme) || { ...DEFAULT_THEME },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Hook to list all presentations for the current user */
export function usePresentations() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user) {
      setPresentations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'presentations'),
      where('hostId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => docToPresentation(d.id, d.data()));
      setPresentations(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return { presentations, loading };
}

/** Hook to load a single presentation by ID */
export function usePresentationById(presentationId: string | null) {
  const firestore = useFirestore();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !presentationId) {
      setPresentation(null);
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, 'presentations', presentationId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setPresentation(docToPresentation(snapshot.id, snapshot.data()));
      } else {
        setPresentation(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, presentationId]);

  return { presentation, loading };
}

/** Hook for presentation CRUD mutations */
export function usePresentationMutations() {
  const firestore = useFirestore();
  const { user } = useUser();

  const createPresentation = useCallback(
    async (title: string, slides: PresentationSlide[] = []): Promise<string> => {
      if (!firestore || !user) throw new Error('Not authenticated');

      const docRef = await addDoc(collection(firestore, 'presentations'), removeUndefined({
        title,
        hostId: user.uid,
        slides,
        settings: DEFAULT_SETTINGS,
        theme: DEFAULT_THEME,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
      return docRef.id;
    },
    [firestore, user]
  );

  const updatePresentation = useCallback(
    async (id: string, data: Partial<Pick<Presentation, 'title' | 'description' | 'slides' | 'settings' | 'theme'>>) => {
      if (!firestore) throw new Error('Firestore not initialized');

      await updateDoc(doc(firestore, 'presentations', id), removeUndefined({
        ...data,
        updatedAt: serverTimestamp(),
      }));
    },
    [firestore]
  );

  const deletePresentation = useCallback(
    async (id: string) => {
      if (!firestore) throw new Error('Firestore not initialized');
      await deleteDoc(doc(firestore, 'presentations', id));
    },
    [firestore]
  );

  return { createPresentation, updatePresentation, deletePresentation };
}
