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
import type { AgenticDesignerSession, AgenticDesignerNudge } from '@/lib/types/agentic-designer';

/**
 * Hook for host to manage an agentic designer session
 * Provides full control over session state, AI generation, and nudges
 */
export function useAgenticSession(gameId: string, elementId: string) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [session, setSession] = useState<AgenticDesignerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nudges, setNudges] = useState<AgenticDesignerNudge[]>([]);

  // Subscribe to session document
  useEffect(() => {
    if (!firestore || !gameId || !elementId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', elementId);

    const unsubscribe = onSnapshot(sessionRef, async (snapshot) => {
      if (!snapshot.exists()) {
        // Auto-create session on first load
        const initialSession: AgenticDesignerSession = {
          elementId,
          currentStep: 1,
          stepsData: {},
          aiOutputs: {},
          completedSteps: [],
          isProcessing: false,
          nudgesOpen: false,
          structuredOutputs: {},
          lastUpdated: Date.now(),
        };

        await setDoc(sessionRef, initialSession);
        setSession(initialSession);
      } else {
        setSession(snapshot.data() as AgenticDesignerSession);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, elementId]);

  // Subscribe to nudges for current step
  useEffect(() => {
    if (!firestore || !gameId || !elementId || !session) {
      setNudges([]);
      return;
    }

    const nudgesRef = collection(firestore, 'games', gameId, 'agenticSessions', elementId, 'nudges');

    const unsubscribe = onSnapshot(nudgesRef, (snapshot) => {
      const allNudges = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AgenticDesignerNudge[];

      // Filter by current step and sort by submission time
      const currentStepNudges = allNudges
        .filter((n) => n.step === session.currentStep)
        .sort((a, b) => a.submittedAt.toMillis() - b.submittedAt.toMillis());

      setNudges(currentStepNudges);
    });

    return () => unsubscribe();
  }, [firestore, gameId, elementId, session?.currentStep]);

  /**
   * Run an AI generation step
   * @param stepNumber - Step to run (1-11)
   * @param nudge - Optional nudge text to include
   * @param stepsData - Optional override for step data
   * @returns The AI-generated output
   */
  const runStep = useCallback(
    async (
      stepNumber: number,
      nudge?: string,
      stepsData?: Record<number, Record<string, string | boolean>>
    ): Promise<string> => {
      if (!functions) throw new Error('Functions not initialized');

      const runStepFn = httpsCallable<
        {
          gameId: string;
          elementId: string;
          stepNumber: number;
          nudge?: string;
          stepsData?: Record<number, Record<string, string | boolean>>;
        },
        { output: string }
      >(functions, 'runAgenticDesignerStep');

      const result = await runStepFn({
        gameId,
        elementId,
        stepNumber,
        nudge,
        stepsData,
      });

      return result.data.output;
    },
    [functions, gameId, elementId]
  );

  /**
   * Update step data (form inputs)
   * @param stepNumber - Step to update
   * @param data - Field values to save
   */
  const updateStepData = useCallback(
    async (stepNumber: number, data: Record<string, string | boolean>): Promise<void> => {
      if (!firestore || !gameId || !elementId) throw new Error('Not connected');

      const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', elementId);
      await updateDoc(sessionRef, {
        [`stepsData.${stepNumber}`]: data,
        lastUpdated: Date.now(),
      });
    },
    [firestore, gameId, elementId]
  );

  /**
   * Navigate to a different step
   * @param step - Step number to navigate to (1-11)
   */
  const setCurrentStep = useCallback(
    async (step: number): Promise<void> => {
      if (!firestore || !gameId || !elementId) throw new Error('Not connected');

      const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', elementId);
      await updateDoc(sessionRef, {
        currentStep: step,
        nudgesOpen: false,
        lastUpdated: Date.now(),
      });
    },
    [firestore, gameId, elementId]
  );

  /**
   * Toggle nudges panel open/closed
   */
  const toggleNudges = useCallback(async (): Promise<void> => {
    if (!firestore || !gameId || !elementId || !session) throw new Error('Not connected');

    const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', elementId);
    await updateDoc(sessionRef, {
      nudgesOpen: !session.nudgesOpen,
      lastUpdated: Date.now(),
    });
  }, [firestore, gameId, elementId, session?.nudgesOpen]);

  /**
   * Summarize all nudges for current step using AI
   * @returns Summary text
   */
  const summarizeNudges = useCallback(async (): Promise<string> => {
    if (!functions || !session) throw new Error('Not initialized');

    const summarizeFn = httpsCallable<
      { gameId: string; elementId: string; stepNumber: number },
      { summary: string }
    >(functions, 'summarizeAgenticNudges');

    const result = await summarizeFn({
      gameId,
      elementId,
      stepNumber: session.currentStep,
    });

    return result.data.summary;
  }, [functions, gameId, elementId, session?.currentStep]);

  /**
   * Clear all nudges for current step
   */
  const clearNudges = useCallback(async (): Promise<void> => {
    if (!firestore || !gameId || !elementId || !session) throw new Error('Not connected');

    const nudgesRef = collection(firestore, 'games', gameId, 'agenticSessions', elementId, 'nudges');
    const q = query(nudgesRef, where('step', '==', session.currentStep));
    const snapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }, [firestore, gameId, elementId, session?.currentStep]);

  return {
    session,
    isLoading,
    nudges,
    runStep,
    updateStepData,
    setCurrentStep,
    toggleNudges,
    summarizeNudges,
    clearNudges,
  };
}

/**
 * Hook for players to view session state and submit nudges
 * Read-only access to session, plus nudge submission
 */
export function useAgenticSessionPlayer(gameId: string, elementId: string, playerId: string) {
  const firestore = useFirestore();
  const [session, setSession] = useState<AgenticDesignerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myNudges, setMyNudges] = useState<AgenticDesignerNudge[]>([]);

  // Subscribe to session document (read-only)
  useEffect(() => {
    if (!firestore || !gameId || !elementId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    const sessionRef = doc(firestore, 'games', gameId, 'agenticSessions', elementId);

    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession(snapshot.data() as AgenticDesignerSession);
      } else {
        setSession(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, elementId]);

  // Subscribe to this player's nudges for current step
  useEffect(() => {
    if (!firestore || !gameId || !elementId || !playerId || !session) {
      setMyNudges([]);
      return;
    }

    const nudgesRef = collection(firestore, 'games', gameId, 'agenticSessions', elementId, 'nudges');
    const q = query(nudgesRef, where('playerId', '==', playerId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMyNudges = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AgenticDesignerNudge[];

      // Filter by current step
      const currentStepNudges = allMyNudges
        .filter((n) => n.step === session.currentStep)
        .sort((a, b) => a.submittedAt.toMillis() - b.submittedAt.toMillis());

      setMyNudges(currentStepNudges);
    });

    return () => unsubscribe();
  }, [firestore, gameId, elementId, playerId, session?.currentStep]);

  /**
   * Submit a nudge for the current step
   * @param text - Nudge text content
   * @param playerName - Name of the player submitting
   */
  const submitNudge = useCallback(
    async (text: string, playerName: string): Promise<void> => {
      if (!firestore || !gameId || !elementId || !playerId || !session) {
        throw new Error('Not connected');
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        throw new Error('Nudge text cannot be empty');
      }

      const nudgesRef = collection(firestore, 'games', gameId, 'agenticSessions', elementId, 'nudges');

      await addDoc(nudgesRef, {
        playerId,
        playerName,
        text: trimmedText,
        step: session.currentStep,
        submittedAt: Timestamp.now(),
      });
    },
    [firestore, gameId, elementId, playerId, session?.currentStep]
  );

  // Derive current step output
  const currentStepOutput = session?.aiOutputs[session.currentStep] ?? null;
  const nudgesOpen = session?.nudgesOpen ?? false;

  return {
    session,
    isLoading,
    currentStepOutput,
    nudgesOpen,
    myNudges,
    submitNudge,
  };
}
