'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore } from '../provider';

/**
 * Stored rating for a slide
 */
export interface StoredSlideRating {
  id: string;
  slideId: string;
  playerId: string;
  playerName: string;
  rating: number;
  submittedAt: Date;
}

/**
 * Hook to get all ratings for a specific slide
 */
export function useSlideRatings(gameId: string | null | undefined, slideId: string | null | undefined) {
  const firestore = useFirestore();
  const [ratings, setRatings] = useState<StoredSlideRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || !slideId) {
      setRatings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query the slideResponses collection with slideId filter
    // Ratings are stored with slideId for filtering
    const ratingsQuery = query(
      collection(firestore, 'games', gameId, 'slideResponses'),
      where('slideId', '==', slideId)
    );

    const unsubscribe = onSnapshot(
      ratingsQuery,
      (snapshot) => {
        const docs = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              slideId: data.slideId as string,
              playerId: data.playerId as string,
              playerName: data.playerName as string,
              rating: data.rating as number | undefined,
              submittedAt: data.submittedAt?.toDate?.() || new Date(),
            };
          })
          .filter((doc): doc is StoredSlideRating =>
            doc.rating !== undefined
          );
        setRatings(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching slide ratings:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideId]);

  // Calculate statistics
  const ratingValues = ratings.map(r => r.rating);
  const totalResponses = ratingValues.length;
  const averageRating = totalResponses > 0
    ? ratingValues.reduce((a, b) => a + b, 0) / totalResponses
    : 0;

  return { ratings, loading, totalResponses, averageRating };
}

/**
 * Hook to check if a player has rated a specific slide
 */
export function usePlayerSlideRating(
  gameId: string | null | undefined,
  slideId: string | null | undefined,
  playerId: string | null | undefined
) {
  const firestore = useFirestore();
  const [hasRated, setHasRated] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || !slideId || !playerId) {
      setHasRated(false);
      setRating(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const responseId = `${slideId}_${playerId}`;
    const ratingRef = doc(firestore, 'games', gameId, 'slideResponses', responseId);

    const unsubscribe = onSnapshot(
      ratingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRating(data.rating ?? null);
          setHasRated(data.rating !== undefined);
        } else {
          setRating(null);
          setHasRated(false);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error checking player rating:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideId, playerId]);

  return { hasRated, rating, loading };
}

/**
 * Hook to submit a rating for a slide
 */
export function useSubmitSlideRating(gameId: string | null | undefined) {
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitRating = useCallback(
    async (params: {
      slideId: string;
      playerId: string;
      playerName: string;
      rating: number;
    }): Promise<void> => {
      if (!firestore || !gameId) {
        throw new Error('Firestore or gameId not available');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        // Use slideId_playerId as document ID for deduplication
        const responseId = `${params.slideId}_${params.playerId}`;
        const ratingRef = doc(firestore, 'games', gameId, 'slideResponses', responseId);

        await setDoc(ratingRef, {
          slideId: params.slideId,
          playerId: params.playerId,
          playerName: params.playerName,
          rating: params.rating,
          slideType: 'rating-input',
          submittedAt: serverTimestamp(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit rating');
        setError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [firestore, gameId]
  );

  return { submitRating, isSubmitting, error };
}

/**
 * Hook to get aggregated rating results for multiple slides (comparison view)
 */
export function useRatingAggregates(gameId: string | null | undefined, slideIds: string[]) {
  const firestore = useFirestore();
  const [aggregates, setAggregates] = useState<Map<string, { average: number; count: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || slideIds.length === 0) {
      setAggregates(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    // Listen to all ratings and filter client-side
    // (Firestore doesn't support 'in' queries with onSnapshot efficiently for many items)
    const allRatingsQuery = collection(firestore, 'games', gameId, 'slideResponses');

    const unsubscribe = onSnapshot(
      allRatingsQuery,
      (snapshot) => {
        const newAggregates = new Map<string, { average: number; count: number }>();

        // Group ratings by slideId
        const ratingsBySlide = new Map<string, number[]>();
        slideIds.forEach(id => ratingsBySlide.set(id, []));

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.rating !== undefined && slideIds.includes(data.slideId)) {
            const slideRatings = ratingsBySlide.get(data.slideId) || [];
            slideRatings.push(data.rating);
            ratingsBySlide.set(data.slideId, slideRatings);
          }
        });

        // Calculate aggregates
        ratingsBySlide.forEach((ratings, slideId) => {
          const count = ratings.length;
          const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;
          newAggregates.set(slideId, { average, count });
        });

        setAggregates(newAggregates);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rating aggregates:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideIds.join(',')]);

  return { aggregates, loading };
}
