import { useState, useEffect, useRef, useCallback } from 'react';
import type { PresentationGame } from '@/lib/types';

export type PresentationPlayerState =
  | 'joining'      // Entering name
  | 'lobby'        // Waiting for presentation to start
  | 'slide'        // Viewing current slide (content or interactive)
  | 'submitted'    // After submitting response, waiting for next slide
  | 'ended';       // Presentation finished

/**
 * State machine hook for presentation player.
 * Manages player state synchronization with game state and slide changes.
 *
 * Similar to usePlayerStateMachine in quiz, but adapted for presentations
 * with multiple interactive slide types.
 */
export function usePresentationPlayerStateMachine(
  gamePin: string,
  hasValidSession: boolean,
  game: PresentationGame | null,
  gameLoading: boolean
) {
  // Initialize state based on session
  const [state, setState] = useState<PresentationPlayerState>(() => {
    if (hasValidSession) {
      return 'lobby'; // Will sync on next effect run
    }
    return 'joining';
  });

  // Track slide index to detect changes (like quiz tracks question index)
  const lastSlideIndexRef = useRef<number>(-1);

  // Main state synchronization effect
  useEffect(() => {
    // Don't sync if game is not loaded yet
    if (!game) {
      // If we're not loading and game is null, it might have been deleted
      if (!gameLoading && state !== 'joining' && state !== 'ended') {
        setState('ended');
      }
      return;
    }

    const gameState = game.state;
    const currentSlideIndex = game.currentSlideIndex;

    // CRITICAL: Never auto-transition from 'joining' state
    // Players must explicitly call setJoined() after entering their name
    // This is different from quiz where gameDocId is null until after joining
    if (state === 'joining') {
      return;
    }

    // CRITICAL: Detect slide index change using ref
    // Refs don't trigger re-renders, but we can compare against them
    const slideChanged = currentSlideIndex !== lastSlideIndexRef.current
      && lastSlideIndexRef.current !== -1;

    if (slideChanged) {
      lastSlideIndexRef.current = currentSlideIndex;

      // Reset to slide state for new slide
      // This ensures player gets fresh state for new interactive slides
      if (state === 'submitted') {
        setState('slide');
        return; // Effect will run again due to state change
      }
    }

    // Update ref on first run or when syncing
    if (currentSlideIndex !== lastSlideIndexRef.current) {
      lastSlideIndexRef.current = currentSlideIndex;
    }

    // State machine transitions
    // Order matters! Handle states from most specific to least specific

    // 1. Terminal state - presentation ended
    if (gameState === 'ended') {
      if (state !== 'ended') {
        setState('ended');
      }
      return;
    }

    // 2. Presentation is active
    if (gameState === 'presenting') {
      // Only transition from 'lobby' to 'slide'
      // Players in 'joining' state must enter their name first
      if (state === 'lobby') {
        setState('slide');
      }
      // If in joining state, stay there until player enters name and joins
      // If in slide or submitted state, stay there (slide change handler above will reset if needed)
      return;
    }

    // 3. Lobby state - waiting for presentation to start
    if (gameState === 'lobby') {
      // Players in 'lobby' state stay there until presentation starts
      // Note: 'joining' state is handled by early return above
      return;
    }
  }, [game?.state, game?.currentSlideIndex, gameLoading, state]);

  // Callback for slide components to mark response as submitted
  const markSubmitted = useCallback(() => {
    if (state === 'slide') {
      setState('submitted');
    }
  }, [state]);

  // Callback for join flow to transition based on current game state
  const setJoined = useCallback(() => {
    if (state === 'joining') {
      // Skip lobby flash if game is already presenting
      if (game?.state === 'presenting') {
        setState('slide');
      } else if (game?.state === 'ended') {
        setState('ended');
      } else {
        setState('lobby');
      }
    }
  }, [state, game?.state]);

  return {
    state,
    setState,
    markSubmitted,
    setJoined,
    currentSlideIndex: lastSlideIndexRef.current,
  };
}
