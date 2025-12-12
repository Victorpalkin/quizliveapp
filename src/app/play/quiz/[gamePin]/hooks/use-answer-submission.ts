import { useCallback, Dispatch, SetStateAction } from 'react';
import { useFunctions, trackEvent } from '@/firebase';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type {
  Player,
  PlayerAnswer,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  FreeResponseQuestion,
  PollSingleQuestion,
  PollMultipleQuestion,
  SubmitAnswerResponse,
  Question,
} from '@/lib/types';
import type { AnswerResult } from '../types';

type QuestionType = Question['type'];

/**
 * Common error handler for answer submissions
 */
function handleSubmissionError(error: any, toast: ReturnType<typeof useToast>['toast'], isPoll = false) {
  console.error('Error submitting answer:', error);

  const entityName = isPoll ? 'poll response' : 'answer';

  if (error.code === 'functions/deadline-exceeded') {
    toast({
      variant: 'destructive',
      title: isPoll ? 'Response Too Late' : 'Answer Too Late',
      description: `Your ${entityName} was submitted after the time limit${isPoll ? '.' : ' and was not counted.'}`
    });
  } else if (error.code === 'functions/failed-precondition') {
    toast({
      variant: 'destructive',
      title: isPoll ? 'Response Not Accepted' : 'Answer Not Accepted',
      description: error.message || 'The game state changed before your response could be processed.'
    });
  } else {
    toast({
      variant: 'destructive',
      title: 'Submission Error',
      description: `Failed to submit ${entityName}.${isPoll ? '' : ' Your score may not be saved.'}`
    });
  }
}

/**
 * Creates an optimistic answer record for local state
 */
function createOptimisticAnswer(
  questionIndex: number,
  questionType: QuestionType,
  points: number,
  isCorrect: boolean,
  answerData: Partial<PlayerAnswer>
): PlayerAnswer {
  return {
    questionIndex,
    questionType,
    timestamp: Timestamp.now(),
    points,
    isCorrect,
    wasTimeout: false,
    ...answerData,
  } as PlayerAnswer;
}

/**
 * Unified answer submission hook with reduced duplication.
 *
 * Features:
 * - Optimistic UI updates for all question types
 * - Server-side validation and scoring
 * - Common error handling
 *
 * Note: Rank is now computed in computeQuestionResults and read from the
 * leaderboard aggregate by the player page, not from submitAnswer response.
 */
export function useAnswerSubmission(
  gameDocId: string | null,
  playerId: string,
  currentQuestionIndex: number,
  _player: Player | null, // Kept for API compatibility, may be used for future optimizations
  setLastAnswer: Dispatch<SetStateAction<AnswerResult | null>>,
  setPlayer: Dispatch<SetStateAction<Player | null>>,
  answerSubmittedRef: React.MutableRefObject<boolean>
) {
  const functions = useFunctions();
  const { toast } = useToast();

  // Submit single choice answer
  // Note: Correct answer is no longer available client-side - we wait for server response
  const submitSingleChoice = useCallback(async (
    answerIndex: number,
    question: SingleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track answer submission
    trackEvent('answer_submitted', {
      question_type: 'single-choice',
      has_time_bonus: timeRemaining > 0,
    });

    // Optimistic UI - show "waiting for server" state
    // Since we don't have the correct answer, we can't calculate score locally
    setLastAnswer({
      selected: answerIndex,
      correct: [], // Will be updated by server
      points: 0, // Will be updated by server
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'single-choice',
      0, // Will be updated by server
      false, // Will be updated by server
      { answerIndex }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Server submission
    try {
      const submitAnswerFn = httpsCallable<any, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        answerIndex,
        timeRemaining,
        questionType: 'single-choice',
        questionTimeLimit: question.timeLimit,
      });

      const { points: actualPoints, newScore, isCorrect } = result.data;

      // Update with server values
      setLastAnswer(prev => prev ? {
        ...prev,
        points: actualPoints,
        correct: isCorrect ? [answerIndex] : [] // If correct, our answer was the correct one
      } : null);

      setPlayer(p => {
        if (!p) return null;
        const updatedAnswers = p.answers.map(a =>
          a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints, isCorrect } : a
        );
        return { ...p, score: newScore, answers: updatedAnswers };
      });
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit multiple choice answer
  // Note: Correct answers are no longer available client-side - we wait for server response
  const submitMultipleChoice = useCallback(async (
    answerIndices: number[],
    question: MultipleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track answer submission
    trackEvent('answer_submitted', {
      question_type: 'multiple-choice',
      has_time_bonus: timeRemaining > 0,
    });

    // Optimistic UI - show "waiting for server" state
    setLastAnswer({
      selected: 0, // Will be updated by server
      correct: [1],
      points: 0, // Will be updated by server
      wasTimeout: false,
      isPartiallyCorrect: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'multiple-choice',
      0, // Will be updated by server
      false, // Will be updated by server
      { answerIndices }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Server submission
    try {
      const submitAnswerFn = httpsCallable<any, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        answerIndices,
        timeRemaining,
        questionType: 'multiple-choice',
        questionTimeLimit: question.timeLimit,
      });

      const { points: actualPoints, newScore, isCorrect, isPartiallyCorrect: serverPartiallyCorrect } = result.data;

      // Update with server values
      setLastAnswer(prev => prev ? {
        ...prev,
        points: actualPoints,
        selected: isCorrect ? 1 : 0,
        isPartiallyCorrect: serverPartiallyCorrect
      } : null);

      setPlayer(p => {
        if (!p) return null;
        const updatedAnswers = p.answers.map(a =>
          a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints, isCorrect } : a
        );
        return { ...p, score: newScore, answers: updatedAnswers };
      });
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit slider answer
  // Note: Correct value is no longer available client-side - we wait for server response
  const submitSlider = useCallback(async (
    sliderValue: number,
    question: SliderQuestion,
    timeRemaining: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track answer submission
    trackEvent('answer_submitted', {
      question_type: 'slider',
      has_time_bonus: timeRemaining > 0,
    });

    // Optimistic UI - show "waiting for server" state
    setLastAnswer({
      selected: 0, // Will be updated by server
      correct: [1],
      points: 0, // Will be updated by server
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'slider',
      0, // Will be updated by server
      false, // Will be updated by server
      { sliderValue }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Server submission
    try {
      const submitAnswerFn = httpsCallable<any, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        sliderValue,
        timeRemaining,
        questionType: 'slider',
        questionTimeLimit: question.timeLimit,
      });

      const { points: actualPoints, newScore, isCorrect } = result.data;

      // Update with server values
      setLastAnswer(prev => prev ? {
        ...prev,
        points: actualPoints,
        selected: isCorrect ? 1 : 0
      } : null);

      setPlayer(p => {
        if (!p) return null;
        const updatedAnswers = p.answers.map(a =>
          a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints, isCorrect } : a
        );
        return { ...p, score: newScore, answers: updatedAnswers };
      });
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit free-response answer
  // Note: Correct answer is no longer available client-side - we wait for server response
  const submitFreeResponse = useCallback(async (
    textAnswer: string,
    question: FreeResponseQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track answer submission
    trackEvent('answer_submitted', {
      question_type: 'free-response',
      has_time_bonus: timeRemaining > 0,
    });

    // Optimistic UI - show "waiting for server" state
    setLastAnswer({
      selected: 0, // Will be updated by server
      correct: [1],
      points: 0, // Will be updated by server
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'free-response',
      0, // Will be updated by server
      false, // Will be updated by server
      { textAnswer }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Server submission for fuzzy matching
    try {
      const submitAnswerFn = httpsCallable<any, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        textAnswer,
        timeRemaining,
        questionType: 'free-response',
        questionTimeLimit: question.timeLimit,
      });

      const { points: actualPoints, newScore, isCorrect } = result.data;

      // Update with server values
      setLastAnswer(prev => prev ? {
        ...prev,
        points: actualPoints,
        selected: isCorrect ? 1 : 0
      } : null);

      setPlayer(p => {
        if (!p) return null;
        const updatedAnswers = p.answers.map(a =>
          a.questionIndex === currentQuestionIndex
            ? { ...a, points: actualPoints, isCorrect }
            : a
        );
        return { ...p, score: newScore, answers: updatedAnswers };
      });
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit poll single choice answer (no scoring)
  const submitPollSingle = useCallback(async (
    answerIndex: number,
    question: PollSingleQuestion,
    timeRemaining: number,
    _timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track poll response
    trackEvent('answer_submitted', {
      question_type: 'poll-single',
      has_time_bonus: false,
    });

    // Polls don't have correct answers - always 0 points
    setLastAnswer({
      selected: answerIndex,
      correct: [],
      points: 0,
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'poll-single',
      0,
      false,
      { answerIndex }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        answerIndex,
        timeRemaining,
        questionType: 'poll-single',
        questionTimeLimit: question.timeLimit,
      });
    } catch (error: any) {
      handleSubmissionError(error, toast, true);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit poll multiple choice answer (no scoring)
  const submitPollMultiple = useCallback(async (
    answerIndices: number[],
    question: PollMultipleQuestion,
    timeRemaining: number,
    _timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track poll response
    trackEvent('answer_submitted', {
      question_type: 'poll-multiple',
      has_time_bonus: false,
    });

    // Polls don't have correct answers - always 0 points
    setLastAnswer({
      selected: 0,
      correct: [],
      points: 0,
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'poll-multiple',
      0,
      false,
      { answerIndices }
    );

    setPlayer(p => p ? {
      ...p,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn({
        gameId: gameDocId,
        playerId,
        questionIndex: currentQuestionIndex,
        answerIndices,
        timeRemaining,
        questionType: 'poll-multiple',
        questionTimeLimit: question.timeLimit,
      });
    } catch (error: any) {
      handleSubmissionError(error, toast, true);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Note: submitTimeout removed - timeout handling is now purely client-side
  // When a player times out:
  // - UI shows "No answer" with 0 points (handled in use-answer-state.ts)
  // - Streak is reset locally (handled in use-answer-state.ts)
  // - No server call needed since:
  //   - Score doesn't change (0 points)
  //   - Streak is display-only and resets on next wrong answer anyway
  //   - totalAnswered counter is only for display, timer handles question end

  return {
    submitSingleChoice,
    submitMultipleChoice,
    submitSlider,
    submitFreeResponse,
    submitPollSingle,
    submitPollMultiple,
  };
}
