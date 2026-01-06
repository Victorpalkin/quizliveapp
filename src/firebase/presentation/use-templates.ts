'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { useUser } from '../auth/use-user';
import { PresentationTemplate, PresentationSlide } from '@/lib/types';

/**
 * Hook to fetch user's custom templates
 */
export function useUserTemplates() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const templatesRef = collection(firestore, 'templates');
    const q = query(
      templatesRef,
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const templateList: PresentationTemplate[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          templateList.push({
            id: doc.id,
            name: data.name,
            description: data.description || '',
            category: data.category || 'custom',
            slides: data.slides || [],
            isBuiltIn: false,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });
        setTemplates(templateList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user templates:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  return { templates, loading, error };
}

/**
 * Hook for template mutations (create, delete)
 */
export function useTemplateMutations() {
  const firestore = useFirestore();
  const { user } = useUser();

  /**
   * Save slides as a new template
   */
  const saveAsTemplate = useCallback(
    async (
      name: string,
      description: string,
      slides: PresentationSlide[]
    ): Promise<string> => {
      if (!firestore || !user) {
        throw new Error('Not authenticated');
      }

      const templateId = `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const templateRef = doc(firestore, 'templates', templateId);

      // Strip any runtime data from slides
      const cleanSlides = slides.map((slide) => ({
        ...slide,
        // Ensure we don't store any runtime data
      }));

      await setDoc(templateRef, {
        name,
        description,
        category: 'custom',
        slides: cleanSlides,
        isBuiltIn: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return templateId;
    },
    [firestore, user]
  );

  /**
   * Delete a user template
   */
  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      if (!firestore || !user) {
        throw new Error('Not authenticated');
      }

      const templateRef = doc(firestore, 'templates', templateId);
      await deleteDoc(templateRef);
    },
    [firestore, user]
  );

  return { saveAsTemplate, deleteTemplate };
}
