'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '../provider';

/**
 * Single response for a quiz/poll slide
 */
export interface QuizPollResponse {
  slideId: string;
  playerId: string;
  playerName: string;
  answerIndex?: number;      // For single-choice
  answerIndices?: number[];  // For multiple-choice
  submittedAt: Date;
}

/**
 * Aggregated results for a quiz/poll slide
 */
export interface QuizPollAggregate {
  slideId: string;
  totalResponses: number;
  answerCounts: number[];    // Count for each answer option
  answerPercentages: number[]; // Percentage for each answer option
}

/**
 * Hook to fetch all responses for multiple quiz/poll slides
 * Returns a Map of slideId -> responses array
 */
export function useQuizPollResponses(
  gameId: string | null | undefined,
  slideIds: string[]
) {
  const firestore = useFirestore();
  const [responses, setResponses] = useState<Map<string, QuizPollResponse[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || slideIds.length === 0) {
      setResponses(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    // Listen to all slideResponses and filter client-side by slideIds
    const allResponsesQuery = collection(firestore, 'games', gameId, 'slideResponses');

    const unsubscribe = onSnapshot(
      allResponsesQuery,
      (snapshot) => {
        const responsesBySlide = new Map<string, QuizPollResponse[]>();

        // Initialize empty arrays for all requested slides
        slideIds.forEach(id => responsesBySlide.set(id, []));

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Only include if it's a quiz/poll response (has answerIndex or answerIndices)
          if (slideIds.includes(data.slideId) &&
              (data.answerIndex !== undefined || data.answerIndices !== undefined)) {
            const slideResponses = responsesBySlide.get(data.slideId) || [];
            slideResponses.push({
              slideId: data.slideId,
              playerId: data.playerId || '',
              playerName: data.playerName || 'Anonymous',
              answerIndex: data.answerIndex,
              answerIndices: data.answerIndices,
              submittedAt: data.submittedAt?.toDate?.() || new Date(),
            });
            responsesBySlide.set(data.slideId, slideResponses);
          }
        });

        setResponses(responsesBySlide);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quiz/poll responses:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideIds.join(',')]);

  return { responses, loading };
}

/**
 * Hook to get aggregated results for multiple quiz/poll slides
 * Returns a Map of slideId -> aggregate (counts and percentages)
 */
export function useQuizPollAggregates(
  gameId: string | null | undefined,
  slideIds: string[],
  answerCountsPerSlide: Map<string, number>  // How many answer options each slide has
) {
  const { responses, loading: responsesLoading } = useQuizPollResponses(gameId, slideIds);
  const [aggregates, setAggregates] = useState<Map<string, QuizPollAggregate>>(new Map());

  useEffect(() => {
    const newAggregates = new Map<string, QuizPollAggregate>();

    slideIds.forEach(slideId => {
      const slideResponses = responses.get(slideId) || [];
      const answerCount = answerCountsPerSlide.get(slideId) || 4;

      // Initialize counts
      const answerCounts = new Array(answerCount).fill(0);

      // Count responses
      slideResponses.forEach(response => {
        if (response.answerIndices) {
          // Multiple choice - count each selected option
          response.answerIndices.forEach(idx => {
            if (idx >= 0 && idx < answerCount) {
              answerCounts[idx]++;
            }
          });
        } else if (response.answerIndex !== undefined) {
          // Single choice
          if (response.answerIndex >= 0 && response.answerIndex < answerCount) {
            answerCounts[response.answerIndex]++;
          }
        }
      });

      // Calculate percentages
      const total = slideResponses.length;
      const answerPercentages = answerCounts.map(count =>
        total > 0 ? (count / total) * 100 : 0
      );

      newAggregates.set(slideId, {
        slideId,
        totalResponses: total,
        answerCounts,
        answerPercentages,
      });
    });

    setAggregates(newAggregates);
  }, [responses, slideIds.join(','), answerCountsPerSlide]);

  return { aggregates, loading: responsesLoading };
}
