'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { SlideOutput } from '@/lib/types';

export function useWorkflowOutputs(gameId: string) {
  const firestore = useFirestore();
  const [slideOutputs, setSlideOutputs] = useState<Record<string, SlideOutput>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId) {
      setLoading(false);
      return;
    }

    const stateRef = doc(firestore, 'games', gameId, 'workflowState', 'state');
    getDoc(stateRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSlideOutputs(data.slideOutputs ?? {});
        }
      })
      .finally(() => setLoading(false));
  }, [firestore, gameId]);

  return { slideOutputs, loading };
}
