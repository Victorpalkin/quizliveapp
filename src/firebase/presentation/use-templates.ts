'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { PresentationTemplate, PresentationSlide, PresentationSettings, PresentationTheme } from '@/lib/types';

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

/** Hook for saving and loading presentation templates */
export function useTemplates() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to user's templates
  useEffect(() => {
    if (!firestore || !user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'templates'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.title || '',
          title: data.title || data.name || '',
          description: data.description || '',
          category: data.category || 'custom',
          thumbnail: data.thumbnail,
          slides: data.slides || [],
          settings: data.settings || DEFAULT_SETTINGS,
          theme: data.theme || DEFAULT_THEME,
          isBuiltIn: false,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as PresentationTemplate;
      });
      setTemplates(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  /** Save current slides as a template */
  const saveTemplate = useCallback(
    async (
      title: string,
      slides: PresentationSlide[],
      settings: PresentationSettings,
      theme: PresentationTheme
    ): Promise<string> => {
      if (!firestore || !user) throw new Error('Not authenticated');

      const docRef = await addDoc(collection(firestore, 'templates'), {
        name: title,
        title,
        description: '',
        category: 'custom',
        slides,
        settings,
        theme,
        isBuiltIn: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [firestore, user]
  );

  /** Delete a template */
  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!firestore) throw new Error('Firestore not initialized');
      await deleteDoc(doc(firestore, 'templates', templateId));
    },
    [firestore]
  );

  return { templates, loading, saveTemplate, deleteTemplate };
}
