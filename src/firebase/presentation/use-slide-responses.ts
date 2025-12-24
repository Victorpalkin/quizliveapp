'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { SlideResponse } from '@/components/app/presentation/slide-types/types';

/**
 * Stored submission in the unified submissions collection
 * Uses rawText format matching standalone thoughts-gathering
 */
export interface StoredSubmission {
  id: string;
  playerId: string;
  playerName: string;
  rawText: string;
  slideId?: string; // For presentation slides
  submittedAt: Date;
}

/**
 * Legacy slide response format (for backwards compatibility during transition)
 */
export interface StoredSlideResponse extends SlideResponse {
  id: string;
  submittedAt: Date;
}

/**
 * Hook to get all submissions for a specific slide
 * Uses the unified `submissions` collection with slideId filter
 */
export function useSlideResponses(gameId: string | null | undefined, slideId: string | null | undefined) {
  const firestore = useFirestore();
  const [responses, setResponses] = useState<StoredSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setResponses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query the unified submissions collection with slideId filter
    const responsesQuery = query(
      collection(firestore, 'games', gameId, 'submissions'),
      where('slideId', '==', slideId)
    );

    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
        })) as StoredSubmission[];
        setResponses(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching slide submissions:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  return { responses, responseCount: responses.length, loading };
}

/**
 * Hook to check if a player has responded to a specific slide
 */
export function usePlayerSlideResponse(
  gameId: string | null | undefined,
  slideId: string | null | undefined,
  playerId: string | null | undefined
) {
  const firestore = useFirestore();
  const [hasResponded, setHasResponded] = useState(false);
  const [response, setResponse] = useState<StoredSlideResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const responseId = useMemo(() => {
    if (!slideId || !playerId) return null;
    return `${slideId}_${playerId}`;
  }, [slideId, playerId]);

  useEffect(() => {
    if (!firestore || !gameId || !responseId) {
      setHasResponded(false);
      setResponse(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const responseRef = doc(firestore, 'games', gameId, 'slideResponses', responseId);

    const unsubscribe = onSnapshot(
      responseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setResponse({
            id: snapshot.id,
            ...data,
            submittedAt: data.submittedAt?.toDate?.() || new Date(),
          } as StoredSlideResponse);
          setHasResponded(true);
        } else {
          setResponse(null);
          setHasResponded(false);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error checking player response:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, responseId]);

  return { hasResponded, response, loading };
}

/**
 * Hook to submit a slide response
 */
export function useSubmitSlideResponse(gameId: string | null | undefined) {
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitResponse = useCallback(
    async (response: SlideResponse): Promise<void> => {
      if (!firestore || !gameId) {
        throw new Error('Firestore or gameId not available');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Use slideId_playerId as document ID for easy lookup and deduplication
        const responseId = `${response.slideId}_${response.playerId}`;
        const responseRef = doc(firestore, 'games', gameId, 'slideResponses', responseId);

        await setDoc(responseRef, {
          ...response,
          submittedAt: serverTimestamp(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit response');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [firestore, gameId]
  );

  return { submitResponse, isSubmitting, error };
}

/**
 * Hook to get topic extraction results for a slide
 * Uses the unified aggregates collection: aggregates/topics-{slideId}
 */
export function useSlideTopics(gameId: string | null | undefined, slideId: string | null | undefined) {
  const firestore = useFirestore();
  const [topics, setTopics] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [processedAt, setProcessedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setTopics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Use unified aggregates collection with topics-{slideId} document
    const topicsRef = doc(firestore, 'games', gameId, 'aggregates', `topics-${slideId}`);

    const unsubscribe = onSnapshot(
      topicsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTopics(data.topics || []);
          setProcessedAt(data.processedAt?.toDate?.() || null);
        } else {
          setTopics(null);
          setProcessedAt(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching slide topics:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  return { topics, loading, processedAt };
}
