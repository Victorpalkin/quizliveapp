import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { trackEvent } from '@/firebase';
import type { Game, Player, Question } from '@/lib/types';
import type { AnswerResult } from '../types';
import type { PlayerState } from './use-player-state-machine';

interface UseAnswerStateParams {
  state: PlayerState;
  setState: (state: PlayerState) => void;
  game: Game | null;
  player: Player | null;
  question: Question | undefined;
  time: number;
  resetTimer: () => void;
}

interface UseAnswerStateReturn {
  answerSelected: boolean;
  setAnswerSelected: Dispatch<SetStateAction<boolean>>;
  timedOut: boolean;
  setTimedOut: Dispatch<SetStateAction<boolean>>;
  lastAnswer: AnswerResult | null;
  setLastAnswer: Dispatch<SetStateAction<AnswerResult | null>>;
  answerSubmittedRef: React.MutableRefObject<boolean>;
}

// Note: Correct answers are no longer available client-side (security improvement).
// For timeout/no-answer scenarios, we just use an empty array since the result
// screen only checks `wasTimeout` to determine what to display.

/**
 * Manages answer state and handles timeout/forced result scenarios.
 *
 * Responsibilities:
 * 1. Track answer selection state (answerSelected, timedOut, lastAnswer)
 * 2. Reset state when entering preparing phase for new question
 * 3. Handle automatic timeout when timer reaches 0
 * 4. Handle forced result when host finishes question before player answers
 */
export function useAnswerState({
  state,
  setState,
  game,
  player,
  question,
  time,
  resetTimer,
}: UseAnswerStateParams): UseAnswerStateReturn {
  const [answerSelected, setAnswerSelected] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<AnswerResult | null>(null);

  // Ref to prevent duplicate submissions
  const answerSubmittedRef = useRef<boolean>(false);

  // Track which question index the player actually sees in question state
  const lastQuestionIndexShownRef = useRef<number>(-1);

  // Reset answer state when preparing for new question
  useEffect(() => {
    if (state === 'preparing') {
      console.log('[Player State] Resetting for new question');
      setAnswerSelected(false);
      setTimedOut(false);
      setLastAnswer(null);
      answerSubmittedRef.current = false;
      resetTimer();
    }
  }, [state, game?.currentQuestionIndex, resetTimer]);

  // Track which question index the player actually sees in question state
  useEffect(() => {
    if (state === 'question' && game?.currentQuestionIndex !== undefined) {
      lastQuestionIndexShownRef.current = game.currentQuestionIndex;
      console.log('[Player State] Now showing question index:', game.currentQuestionIndex);
    }
  }, [state, game?.currentQuestionIndex]);

  // Handle timeout when time reaches 0
  // Note: No server call needed - streak is computed in computeQuestionResults
  // which handles players with no answer (timeout) correctly
  useEffect(() => {
    if (
      state === 'question' &&
      time === 0 &&
      !answerSelected &&
      !timedOut &&
      !answerSubmittedRef.current &&
      question
    ) {
      setTimedOut(true);
      setAnswerSelected(true);

      // Track timeout event
      trackEvent('player_timeout', {
        question_type: question.type,
      });

      // For slides, just transition to waiting without setting answer result
      if (question.type === 'slide') {
        setState('waiting');
        return;
      }

      // Set local state immediately for question types that need answers
      // This shows "No answer" with 0 points on the result screen
      setLastAnswer({
        selected: -1,
        correct: [], // Not available client-side for security
        points: 0,
        wasTimeout: true
      });

      setState('waiting');
    }
  }, [time, state, answerSelected, timedOut, question, setState]);

  // Handle forced result screen when host finishes question early (before player answered)
  // Note: No server call needed - streak is computed in computeQuestionResults
  useEffect(() => {
    if (
      state === 'result' &&
      !answerSelected &&
      !answerSubmittedRef.current &&
      question &&
      game
    ) {
      // Skip for slides
      if (question.type === 'slide') return;

      // Only apply forced result if player actually saw this question in 'question' state
      // This prevents false positives when transitioning through states quickly
      if (lastQuestionIndexShownRef.current !== game.currentQuestionIndex) {
        console.log('[Player State] Skipping forced result - player never saw question', game.currentQuestionIndex);
        return;
      }

      // Check if already answered this question in answers array
      const hasAnswered = player?.answers?.some(a => a.questionIndex === game.currentQuestionIndex);
      if (hasAnswered) return;

      console.log('[Player State] Forced to result without answering - showing "No answer"');

      // Mark as answered to prevent re-triggering
      setAnswerSelected(true);
      setTimedOut(true);

      // Set "No answer" result - this shows on the result screen
      setLastAnswer({
        selected: -1,
        correct: [], // Not available client-side for security
        points: 0,
        wasTimeout: true
      });
    }
  }, [state, answerSelected, question, game, player?.answers]);

  return {
    answerSelected,
    setAnswerSelected,
    timedOut,
    setTimedOut,
    lastAnswer,
    setLastAnswer,
    answerSubmittedRef,
  };
}
