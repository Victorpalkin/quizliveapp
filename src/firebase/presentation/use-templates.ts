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
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { removeUndefined } from '@/lib/firestore-utils';
import { BUILT_IN_TEMPLATES } from '@/lib/built-in-templates';
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

// Built-in templates computed once at module scope — always available
const builtInTemplates: PresentationTemplate[] = BUILT_IN_TEMPLATES.map((t, i) => ({
  ...t,
  id: `built-in-${i}`,
}));

/** Hook for saving and loading presentation templates */
export function useTemplates() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [templates, setTemplates] = useState<PresentationTemplate[]>(builtInTemplates);
  const [loading, setLoading] = useState(true);

  // Subscribe to user's own templates + public templates
  useEffect(() => {
    if (!firestore || !user) {
      setTemplates(builtInTemplates);
      setLoading(false);
      return;
    }

    // Query 1: user's own templates (any visibility)
    const ownQuery = query(
      collection(firestore, 'templates'),
      where('createdBy', '==', user.uid)
    );

    // Query 2: public templates from anyone
    const publicQuery = query(
      collection(firestore, 'templates'),
      where('visibility', '==', 'public')
    );

    const seen = new Set<string>();
    let ownResults: PresentationTemplate[] = [];
    let publicResults: PresentationTemplate[] = [];
    let ownLoaded = false;
    let publicLoaded = false;

    const mergeAndUpdate = () => {
      if (!ownLoaded || !publicLoaded) return;
      seen.clear();
      const merged: PresentationTemplate[] = [];
      // Own templates first, then public, then built-in (deduplicate)
      for (const t of [...ownResults, ...publicResults, ...builtInTemplates]) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      setTemplates(merged);
      setLoading(false);
    };

    const mapDoc = (d: import('firebase/firestore').QueryDocumentSnapshot): PresentationTemplate => {
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
        isBuiltIn: data.isBuiltIn || false,
        visibility: data.visibility || 'private',
        createdBy: data.createdBy,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
      };
    };

    const unsubOwn = onSnapshot(ownQuery, (snapshot) => {
      ownResults = snapshot.docs.map(mapDoc);
      ownLoaded = true;
      mergeAndUpdate();
    }, () => {
      // On error (e.g. permission-denied), treat as empty and continue
      ownLoaded = true;
      mergeAndUpdate();
    });

    const unsubPublic = onSnapshot(publicQuery, (snapshot) => {
      publicResults = snapshot.docs.map(mapDoc);
      publicLoaded = true;
      mergeAndUpdate();
    }, () => {
      // On error (e.g. permission-denied), treat as empty and continue
      publicLoaded = true;
      mergeAndUpdate();
    });

    return () => {
      unsubOwn();
      unsubPublic();
    };
  }, [firestore, user]);

  /** Save current slides as a template */
  const saveTemplate = useCallback(
    async (
      title: string,
      slides: PresentationSlide[],
      settings: PresentationSettings,
      theme: PresentationTheme,
      visibility: 'private' | 'public' = 'public'
    ): Promise<string> => {
      if (!firestore || !user) throw new Error('Not authenticated');

      const docRef = await addDoc(collection(firestore, 'templates'), removeUndefined({
        name: title,
        title,
        description: '',
        category: 'custom',
        slides,
        settings,
        theme,
        isBuiltIn: false,
        visibility,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
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
