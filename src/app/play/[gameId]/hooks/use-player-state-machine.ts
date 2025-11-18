import { useState, useEffect, useRef } from 'react';
import type { Game, Quiz } from '@/lib/types';
import { isLastQuestion as checkIsLastQuestion } from '@/lib/utils/game-utils';

export type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

export function usePlayerStateMachine(
  gamePin: string,
  hasValidSession: boolean,
  game: Game | null,
  quiz: Quiz | null,
  gameLoading: boolean,
  timedOut: boolean
) {
  // Initialize state from session if available
  const [state, setState] = useState<PlayerState>(() => {
    if (hasValidSession) {
      return 'reconnecting';
    }
    return 'joining';
  });

  // Use ref to track question index - refs don't trigger re-renders
  const lastQuestionIndexRef = useRef<number>(-1);

  // Calculate if this is the last question
  const isLastQuestion = checkIsLastQuestion(game, quiz);

  // Main state synchronization effect
  useEffect(() => {
    if (!game && !gameLoading && state !== 'joining' && state !== 'cancelled') {
      setState('cancelled');
      return;
    }

    if (!game) return;

    const hostState = game.state;
    const currentQuestionIndex = game.currentQuestionIndex;

    // CRITICAL: Detect question index change using ref
    // Refs don't trigger re-renders, but we can compare against them
    const questionChanged = currentQuestionIndex !== lastQuestionIndexRef.current && lastQuestionIndexRef.current !== -1;

    if (questionChanged) {
      console.log(`[Player State] Question changed: ${lastQuestionIndexRef.current} → ${currentQuestionIndex}`);
      // Update ref immediately
      lastQuestionIndexRef.current = currentQuestionIndex;

      // When question changes, force player to 'preparing' state to reset for new question
      // This ensures player never gets stuck on result screens
      if (state !== 'joining' && state !== 'lobby' && state !== 'cancelled') {
        console.log(`[Player State] Resetting to 'preparing' due to question change`);
        setState('preparing');
        return; // Effect will run again due to state change
      }
    }

    // Update ref on first run or when syncing
    if (currentQuestionIndex !== lastQuestionIndexRef.current) {
      lastQuestionIndexRef.current = currentQuestionIndex;
    }

    // State machine for player-host sync
    // Order matters! Handle states from most specific to least specific

    // 1. Terminal state - game ended
    if (hostState === 'ended') {
      if (state !== 'ended') {
        console.log(`[Player State] Game ended: ${state} → ended`);
        setState('ended');
      }
      return;
    }

    // 2. Initial join flow
    if (hostState === 'lobby' && state === 'joining') {
      console.log(`[Player State] Joined lobby: joining → lobby`);
      setState('lobby');
      return;
    }

    // 3. Leaderboard - show results to all players (answered, timed out, or forced by host)
    if (hostState === 'leaderboard') {
      if (state === 'waiting' || state === 'question') {
        console.log(`[Player State] Showing result: ${state} → result`);
        setState('result');
      }
      // If already in result, stay there
      return;
    }

    // 4. Question - transition from preparing to question
    if (hostState === 'question') {
      if (state === 'preparing') {
        console.log(`[Player State] Showing question: preparing → question`);
        setState('question');
      }
      // If in other states (waiting, result), stay there until question changes
      return;
    }

    // 5. Preparing - handle game start from lobby
    if (hostState === 'preparing') {
      if (state === 'lobby') {
        console.log(`[Player State] Game starting: lobby → preparing`);
        setState('preparing');
      }
      // If in other states, question change handler above should have moved to preparing
      return;
    }
  }, [game?.state, game?.currentQuestionIndex, gameLoading, state, timedOut]);

  return {
    state,
    setState,
    isLastQuestion
  };
}
