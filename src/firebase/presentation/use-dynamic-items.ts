'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { PresentationWorkflowState } from '@/lib/types';

interface DynamicItemsSource {
  sourceSlideId: string;
  sourceElementId: string;
}

interface DynamicItem {
  id: string;
  text: string;
  description?: string;
}

/**
 * Hook to load structured items from an ai-step slide's output.
 * Used by evaluation and poll elements to get dynamic items at runtime.
 */
export function useDynamicItems(
  gameId: string,
  dynamicItemsSource?: DynamicItemsSource
): { items: DynamicItem[] | null; isLoading: boolean } {
  const firestore = useFirestore();
  const [items, setItems] = useState<DynamicItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(!!dynamicItemsSource);

  useEffect(() => {
    if (!firestore || !gameId || !dynamicItemsSource) {
      setItems(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const stateRef = doc(firestore, 'games', gameId, 'workflowState', 'state');

    const unsubscribe = onSnapshot(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.data() as PresentationWorkflowState;
        const output = state.slideOutputs[dynamicItemsSource.sourceSlideId];
        if (output?.structuredItems?.length) {
          setItems(
            output.structuredItems.map((item) => ({
              id: item.id,
              text: item.name,
              description: item.description,
            }))
          );
        } else {
          setItems(null);
        }
      } else {
        setItems(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, dynamicItemsSource?.sourceSlideId, dynamicItemsSource?.sourceElementId]);

  return { items, isLoading };
}
