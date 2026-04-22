'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import type {
  PresentationWorkflowState,
  SlideOutput,
  AIStepNudge,
} from '@/lib/types';

const EMPTY_STATE: PresentationWorkflowState = {
  slideOutputs: {},
  isProcessing: false,
};

/**
 * Hook for host to manage workflow state across ai-step slides.
 * Provides AI generation, nudge management, and output reading.
 */
export function useWorkflowState(gameId: string) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [workflowState, setWorkflowState] = useState<PresentationWorkflowState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to workflow state document
  useEffect(() => {
    if (!firestore || !gameId) {
      setWorkflowState(EMPTY_STATE);
      setIsLoading(false);
      return;
    }

    const stateRef = doc(firestore, 'games', gameId, 'workflowState', 'state');

    const unsubscribe = onSnapshot(stateRef, (snapshot) => {
      if (!snapshot.exists()) {
        setDoc(stateRef, EMPTY_STATE).catch(() => {});
        setWorkflowState(EMPTY_STATE);
      } else {
        setWorkflowState(snapshot.data() as PresentationWorkflowState);
      }
      setIsLoading(false);
    }, () => {
      setWorkflowState(EMPTY_STATE);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  /** Get output for a specific slide */
  const getSlideOutput = useCallback(
    (slideId: string): SlideOutput | undefined => {
      return workflowState.slideOutputs[slideId];
    },
    [workflowState.slideOutputs]
  );

  /**
   * Run AI generation for a slide
   * @param slideId - The slide to generate for
   * @param presentationId - The presentation containing the slide
   * @param nudge - Optional nudge text to include
   * @param hostInputs - Host field values
   */
  const runAIStep = useCallback(
    async (
      slideId: string,
      presentationId: string,
      nudge?: string,
      hostInputs?: Record<string, string | boolean>
    ): Promise<string> => {
      if (!functions) throw new Error('Functions not initialized');

      const runFn = httpsCallable<
        {
          gameId: string;
          slideId: string;
          presentationId: string;
          nudge?: string;
          hostInputs?: Record<string, string | boolean>;
        },
        { output: string }
      >(functions, 'runAIStep');

      const result = await runFn({
        gameId,
        slideId,
        presentationId,
        nudge,
        hostInputs,
      });

      return result.data.output;
    },
    [functions, gameId]
  );

  /**
   * Update host inputs for a slide (without running generation)
   */
  const updateHostInputs = useCallback(
    async (slideId: string, inputs: Record<string, string | boolean>): Promise<void> => {
      if (!firestore || !gameId) throw new Error('Not connected');

      const stateRef = doc(firestore, 'games', gameId, 'workflowState', 'state');
      await updateDoc(stateRef, {
        [`slideOutputs.${slideId}.hostInputs`]: inputs,
      });
    },
    [firestore, gameId]
  );

  return {
    workflowState,
    isLoading,
    getSlideOutput,
    runAIStep,
    updateHostInputs,
    isProcessing: workflowState.isProcessing,
    processingSlideId: workflowState.processingSlideId,
  };
}

/**
 * Hook for managing nudges for a specific ai-step slide.
 * Used by both host (read all + summarize) and derived hooks.
 */
export function useSlideNudges(gameId: string, slideId: string) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [nudges, setNudges] = useState<AIStepNudge[]>([]);
  const [nudgesOpen, setNudgesOpen] = useState(true);

  // Subscribe to nudge settings (open/closed state)
  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setNudgesOpen(true);
      return;
    }

    const settingsRef = doc(firestore, 'games', gameId, 'slideNudges', slideId);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setNudgesOpen(snapshot.data().nudgesOpen ?? true);
      } else {
        setNudgesOpen(true);
      }
    });

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  // Subscribe to nudges for this slide
  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setNudges([]);
      return;
    }

    const nudgesRef = collection(firestore, 'games', gameId, 'slideNudges', slideId, 'nudges');

    const unsubscribe = onSnapshot(nudgesRef, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AIStepNudge[];

      items.sort((a, b) => a.submittedAt.toMillis() - b.submittedAt.toMillis());
      setNudges(items);
    });

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  /** Summarize all nudges using AI */
  const summarizeNudges = useCallback(async (): Promise<string> => {
    if (!functions) throw new Error('Not initialized');

    const summarizeFn = httpsCallable<
      { gameId: string; slideId: string },
      { summary: string }
    >(functions, 'summarizeSlideNudges');

    const result = await summarizeFn({ gameId, slideId });
    return result.data.summary;
  }, [functions, gameId, slideId]);

  /** Clear all nudges for this slide */
  const clearNudges = useCallback(async (): Promise<void> => {
    if (!firestore || !gameId || !slideId) throw new Error('Not connected');

    const nudgesRef = collection(firestore, 'games', gameId, 'slideNudges', slideId, 'nudges');
    const snapshot = await getDocs(query(nudgesRef));

    const batch = writeBatch(firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }, [firestore, gameId, slideId]);

  /** Toggle nudges open/closed */
  const toggleNudges = useCallback(async (): Promise<void> => {
    if (!firestore || !gameId || !slideId) throw new Error('Not connected');

    const settingsRef = doc(firestore, 'games', gameId, 'slideNudges', slideId);
    await setDoc(settingsRef, { nudgesOpen: !nudgesOpen }, { merge: true });
  }, [firestore, gameId, slideId, nudgesOpen]);

  return { nudges, nudgesOpen, toggleNudges, summarizeNudges, clearNudges };
}

/**
 * Hook for players to view workflow output and submit nudges for an ai-step slide.
 */
export function useWorkflowStatePlayer(
  gameId: string,
  slideId: string,
  playerId: string
) {
  const firestore = useFirestore();
  const [slideOutput, setSlideOutput] = useState<SlideOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [myNudges, setMyNudges] = useState<AIStepNudge[]>([]);
  const [nudgesOpen, setNudgesOpen] = useState(true);

  // Subscribe to nudge settings (open/closed state)
  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setNudgesOpen(true);
      return;
    }

    const settingsRef = doc(firestore, 'games', gameId, 'slideNudges', slideId);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setNudgesOpen(snapshot.data().nudgesOpen ?? true);
      } else {
        setNudgesOpen(true);
      }
    });

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  // Subscribe to workflow state to get this slide's output
  useEffect(() => {
    if (!firestore || !gameId) {
      setSlideOutput(null);
      setIsLoading(false);
      return;
    }

    const stateRef = doc(firestore, 'games', gameId, 'workflowState', 'state');

    const unsubscribe = onSnapshot(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.data() as PresentationWorkflowState;
        setSlideOutput(state.slideOutputs[slideId] ?? null);
        setIsProcessing(
          state.isProcessing === true && state.processingSlideId === slideId
        );
      } else {
        setSlideOutput(null);
        setIsProcessing(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  // Subscribe to this player's nudges for this slide
  useEffect(() => {
    if (!firestore || !gameId || !slideId || !playerId) {
      setMyNudges([]);
      return;
    }

    const nudgesRef = collection(firestore, 'games', gameId, 'slideNudges', slideId, 'nudges');
    const q = query(nudgesRef, where('playerId', '==', playerId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AIStepNudge[];

      items.sort((a, b) => a.submittedAt.toMillis() - b.submittedAt.toMillis());
      setMyNudges(items);
    });

    return () => unsubscribe();
  }, [firestore, gameId, slideId, playerId]);

  /** Submit a nudge for this slide */
  const submitNudge = useCallback(
    async (text: string, playerName: string): Promise<void> => {
      if (!firestore || !gameId || !slideId || !playerId) {
        throw new Error('Not connected');
      }

      const trimmedText = text.trim();
      if (!trimmedText) throw new Error('Nudge text cannot be empty');

      const nudgesRef = collection(firestore, 'games', gameId, 'slideNudges', slideId, 'nudges');

      await addDoc(nudgesRef, {
        playerId,
        playerName,
        text: trimmedText,
        slideId,
        submittedAt: Timestamp.now(),
      });
    },
    [firestore, gameId, slideId, playerId]
  );

  return {
    slideOutput,
    isLoading,
    isProcessing,
    myNudges,
    nudgesOpen,
    submitNudge,
  };
}
