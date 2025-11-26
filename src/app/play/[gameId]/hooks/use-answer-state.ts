import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
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
  /** Whether timeout was triggered this question (page should call submitTimeout when true) */
  shouldSubmitTimeout: boolean;
}

/**
 * Extracts correct answer indices from a question based on its type.
 */
function getCorrectAnswers(question: Question): number[] {
  switch (question.type) {
    case 'single-choice':
      return [question.correctAnswerIndex];
    case 'multiple-choice':
      return question.correctAnswerIndices;
    case 'slider':
      return [1]; // Placeholder for slider correctness
    default:
      return []; // Poll types have no correct answers
  }
}

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
  const [shouldSubmitTimeout, setShouldSubmitTimeout] = useState(false);

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
      setShouldSubmitTimeout(false);
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

      // For slides, just transition to waiting without setting answer result
      if (question.type === 'slide') {
        setState('waiting');
        return;
      }

      // Set local state immediately for question types that need answers
      const correctAnswers = getCorrectAnswers(question);

      setLastAnswer({
        selected: -1,
        correct: correctAnswers,
        points: 0,
        wasTimeout: true
      });

      setState('waiting');
      setShouldSubmitTimeout(true);
    }
  }, [time, state, answerSelected, timedOut, question, setState]);

  // Handle forced result screen when host finishes question early (before player answered)
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

      // Set "No answer" result
      const correctAnswers = getCorrectAnswers(question);

      setLastAnswer({
        selected: -1,
        correct: correctAnswers,
        points: 0,
        wasTimeout: true
      });

      // Signal that timeout should be submitted - page will call submitTimeout
      setShouldSubmitTimeout(true);
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
    shouldSubmitTimeout,
  };
}
