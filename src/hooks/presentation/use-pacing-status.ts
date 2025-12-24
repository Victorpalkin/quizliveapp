'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { PresentationSlide, Presentation, PresentationSlideType } from '@/lib/types';

/**
 * Pacing status for the current slide
 */
export interface PacingStatus {
  responseCount: number;      // How many unique players have responded
  playerCount: number;        // Total players in game
  percentage: number;         // responseCount / playerCount * 100
  thresholdMet: boolean;      // Has the pacing threshold been reached
  isInteractiveSlide: boolean; // Does this slide require responses
  pacingMode: 'none' | 'threshold' | 'all';
  requiredThreshold: number;  // The threshold percentage required (0-100)
}

/**
 * Slide types that are interactive and can have pacing
 */
const INTERACTIVE_SLIDE_TYPES: PresentationSlideType[] = [
  'quiz',
  'poll',
  'thoughts-collect',
  'rating-input',
];

/**
 * Check if a slide type is interactive
 */
function isInteractiveSlideType(type: PresentationSlideType): boolean {
  return INTERACTIVE_SLIDE_TYPES.includes(type);
}

/**
 * Get the effective pacing mode for a slide
 */
function getEffectivePacingMode(
  slide: PresentationSlide | null,
  presentation: Presentation | null
): 'none' | 'threshold' | 'all' {
  // If slide has explicit pacing, use it
  if (slide?.pacingMode) {
    return slide.pacingMode;
  }
  // Otherwise use presentation default
  if (presentation?.defaultPacingMode) {
    return presentation.defaultPacingMode;
  }
  // Default to 'none'
  return 'none';
}

/**
 * Get the effective pacing threshold
 */
function getEffectivePacingThreshold(
  slide: PresentationSlide | null,
  presentation: Presentation | null
): number {
  // If slide has explicit threshold, use it
  if (slide?.pacingThreshold !== undefined) {
    return slide.pacingThreshold;
  }
  // Otherwise use presentation default
  if (presentation?.defaultPacingThreshold !== undefined) {
    return presentation.defaultPacingThreshold;
  }
  // Default to 80%
  return 80;
}

/**
 * Hook to compute pacing status for the current slide
 */
export function usePacingStatus(
  gameId: string | null | undefined,
  slideId: string | null | undefined,
  slide: PresentationSlide | null,
  presentation: Presentation | null,
  playerCount: number
): PacingStatus {
  const firestore = useFirestore();
  const [responseCount, setResponseCount] = useState(0);

  // Determine if this is an interactive slide
  const isInteractiveSlide = useMemo(() => {
    if (!slide) return false;
    return isInteractiveSlideType(slide.type);
  }, [slide]);

  // Get effective pacing settings
  const pacingMode = useMemo(() => {
    if (!isInteractiveSlide) return 'none';
    return getEffectivePacingMode(slide, presentation);
  }, [slide, presentation, isInteractiveSlide]);

  const requiredThreshold = useMemo(() => {
    if (pacingMode === 'all') return 100;
    if (pacingMode === 'none') return 0;
    return getEffectivePacingThreshold(slide, presentation);
  }, [slide, presentation, pacingMode]);

  // Subscribe to slide responses to count them
  useEffect(() => {
    if (!firestore || !gameId || !slideId || !isInteractiveSlide) {
      setResponseCount(0);
      return;
    }

    // Query slideResponses collection for this slide
    // Document IDs are `slideId_playerId`, so we query by slideId field
    const responsesQuery = query(
      collection(firestore, 'games', gameId, 'slideResponses'),
      where('slideId', '==', slideId)
    );

    const unsubscribe = onSnapshot(
      responsesQuery,
      (snapshot) => {
        // Count unique players who have responded
        const uniquePlayers = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.playerId) {
            uniquePlayers.add(data.playerId);
          }
        });
        setResponseCount(uniquePlayers.size);
      },
      (err) => {
        console.error('Error fetching response count for pacing:', err);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, slideId, isInteractiveSlide]);

  // Calculate percentage and threshold met
  const percentage = useMemo(() => {
    if (playerCount === 0) return 0;
    return Math.round((responseCount / playerCount) * 100);
  }, [responseCount, playerCount]);

  const thresholdMet = useMemo(() => {
    // Non-interactive slides always allow advance
    if (!isInteractiveSlide) return true;

    // 'none' mode always allows advance
    if (pacingMode === 'none') return true;

    // No players = allow advance (edge case)
    if (playerCount === 0) return true;

    // Check if we've met the threshold
    return percentage >= requiredThreshold;
  }, [isInteractiveSlide, pacingMode, playerCount, percentage, requiredThreshold]);

  return {
    responseCount,
    playerCount,
    percentage,
    thresholdMet,
    isInteractiveSlide,
    pacingMode,
    requiredThreshold,
  };
}

/**
 * Export helper function for checking interactive slides
 */
export { isInteractiveSlideType, INTERACTIVE_SLIDE_TYPES };
