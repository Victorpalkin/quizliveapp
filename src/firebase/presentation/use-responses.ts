'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import type { PresentationElementResponse } from '@/lib/types';

/** Hook to submit and read responses for presentation interactive elements */
export function useResponses(gameId: string | null) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [responses, setResponses] = useState<PresentationElementResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to all responses for this game
  useEffect(() => {
    if (!firestore || !gameId) {
      setResponses([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(firestore, 'games', gameId, 'responses'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            elementId: data.elementId,
            slideId: data.slideId,
            playerId: data.playerId,
            playerName: data.playerName,
            submittedAt: data.submittedAt,
            timeRemaining: data.timeRemaining,
            answerIndex: data.answerIndex,
            answerIndices: data.answerIndices,
            textAnswers: data.textAnswers,
            ratingValue: data.ratingValue,
          } as PresentationElementResponse;
        });
        setResponses(items);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId]);

  /** Get responses for a specific element */
  const getElementResponses = useCallback(
    (elementId: string) => responses.filter((r) => r.elementId === elementId),
    [responses]
  );

  /** Check if a player has responded to an element */
  const hasPlayerResponded = useCallback(
    (elementId: string, playerId: string) =>
      responses.some((r) => r.elementId === elementId && r.playerId === playerId),
    [responses]
  );

  /** Submit a quiz answer via Cloud Function (server-side scoring) */
  const submitQuizAnswer = useCallback(
    async (data: {
      gameId: string;
      elementId: string;
      slideId: string;
      playerId: string;
      playerName: string;
      answerIndex: number;
      timeRemaining: number;
    }) => {
      if (!functions) throw new Error('Functions not initialized');

      const fn = httpsCallable(functions, 'submitPresentationAnswer');
      return fn(data);
    },
    [functions]
  );

  /** Submit a non-scored response (poll, thoughts, rating) directly to Firestore */
  const submitResponse = useCallback(
    async (data: {
      elementId: string;
      slideId: string;
      playerId: string;
      playerName: string;
      answerIndex?: number;
      answerIndices?: number[];
      textAnswers?: string[];
      ratingValue?: number;
      timeRemaining?: number;
    }) => {
      if (!firestore || !gameId) throw new Error('Not connected');

      const responseId = `${data.elementId}_${data.playerId}`;
      await setDoc(doc(firestore, 'games', gameId, 'responses', responseId), {
        ...data,
        submittedAt: serverTimestamp(),
      });
    },
    [firestore, gameId]
  );

  return {
    responses,
    loading,
    getElementResponses,
    hasPlayerResponded,
    submitQuizAnswer,
    submitResponse,
  };
}

/** Hook to get response count for an element (lightweight) */
export function useResponseCount(gameId: string | null, elementId: string | null) {
  const firestore = useFirestore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!firestore || !gameId || !elementId) {
      setCount(0);
      return;
    }

    // Query responses for this specific element
    const q = query(
      collection(firestore, 'games', gameId, 'responses'),
      where('elementId', '==', elementId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [firestore, gameId, elementId]);

  return count;
}
