import { useCallback, Dispatch, SetStateAction } from 'react';
import { useFunctions } from '@/firebase';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type {
  Player,
  PlayerAnswer,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  SliderQuestion,
  SlideQuestion,
  FreeResponseQuestion,
  PollSingleQuestion,
  PollMultipleQuestion,
  SubmitAnswerResponse,
  Question,
} from '@/lib/types';
import { calculateTimeBasedScore, calculateProportionalScore, calculateSliderScore } from '@/lib/scoring';
import type { AnswerResult, RankInfo } from '../types';

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
 * - Rank tracking from server response
 */
export function useAnswerSubmission(
  gameDocId: string | null,
  playerId: string,
  currentQuestionIndex: number,
  _player: Player | null, // Kept for API compatibility, may be used for future optimizations
  setLastAnswer: Dispatch<SetStateAction<AnswerResult | null>>,
  setPlayer: Dispatch<SetStateAction<Player | null>>,
  answerSubmittedRef: React.MutableRefObject<boolean>,
  setRankInfo?: Dispatch<SetStateAction<RankInfo | null>>
) {
  const functions = useFunctions();
  const { toast } = useToast();

  // Submit single choice answer
  const submitSingleChoice = useCallback(async (
    answerIndex: number,
    question: SingleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    const isCorrect = answerIndex === question.correctAnswerIndex;
    const estimatedPoints = calculateTimeBasedScore(isCorrect, timeRemaining, timeLimit);

    // Optimistic UI
    setLastAnswer({
      selected: answerIndex,
      correct: [question.correctAnswerIndex],
      points: estimatedPoints,
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'single-choice',
      estimatedPoints,
      isCorrect,
      { answerIndex }
    );

    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
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
        correctAnswerIndex: question.correctAnswerIndex,
      });

      const { points: actualPoints, newScore, currentStreak, rank, totalPlayers } = result.data;
      setRankInfo?.({ rank, totalPlayers });

      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, currentStreak: currentStreak ?? 0, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore, currentStreak: currentStreak ?? 0 } : null);
      }
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer, setRankInfo]);

  // Submit multiple choice answer
  const submitMultipleChoice = useCallback(async (
    answerIndices: number[],
    question: MultipleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    const correctAnswerIndices = question.correctAnswerIndices;
    const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
    const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
    const totalCorrect = correctAnswerIndices.length;

    const estimatedPoints = calculateProportionalScore(
      correctSelected, wrongSelected, totalCorrect, timeRemaining, timeLimit
    );
    const isCorrect = correctSelected === totalCorrect && wrongSelected === 0;
    const isPartiallyCorrect = !isCorrect && estimatedPoints > 0;

    // Optimistic UI
    setLastAnswer({
      selected: isCorrect ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false,
      isPartiallyCorrect
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'multiple-choice',
      estimatedPoints,
      isCorrect,
      { answerIndices }
    );

    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
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
        correctAnswerIndices: question.correctAnswerIndices,
      });

      const { points: actualPoints, newScore, isPartiallyCorrect: serverPartiallyCorrect, currentStreak, rank, totalPlayers } = result.data;
      setRankInfo?.({ rank, totalPlayers });

      if (actualPoints !== estimatedPoints || serverPartiallyCorrect !== isPartiallyCorrect) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints, isPartiallyCorrect: serverPartiallyCorrect } : null);
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, currentStreak: currentStreak ?? 0, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore, currentStreak: currentStreak ?? 0 } : null);
      }
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer, setRankInfo]);

  // Submit slider answer
  const submitSlider = useCallback(async (
    sliderValue: number,
    question: SliderQuestion,
    timeRemaining: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    const { points: estimatedPoints, isCorrect } = calculateSliderScore(
      sliderValue,
      question.correctValue,
      question.minValue,
      question.maxValue,
      timeRemaining,
      question.timeLimit || 20,
      question.acceptableError
    );

    // Optimistic UI
    setLastAnswer({
      selected: isCorrect ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'slider',
      estimatedPoints,
      isCorrect,
      { sliderValue }
    );

    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
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
        correctValue: question.correctValue,
        minValue: question.minValue,
        maxValue: question.maxValue,
        acceptableError: question.acceptableError,
      });

      const { points: actualPoints, newScore, currentStreak, rank, totalPlayers } = result.data;
      setRankInfo?.({ rank, totalPlayers });

      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, currentStreak: currentStreak ?? 0, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore, currentStreak: currentStreak ?? 0 } : null);
      }
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer, setRankInfo]);

  // Submit free-response answer
  const submitFreeResponse = useCallback(async (
    textAnswer: string,
    question: FreeResponseQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Optimistic estimate: assume correct if non-empty (server validates)
    const estimatedPoints = textAnswer.trim() ? calculateTimeBasedScore(true, timeRemaining, timeLimit) : 0;

    // Optimistic UI
    setLastAnswer({
      selected: textAnswer.trim() ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false
    });

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      'free-response',
      estimatedPoints,
      true, // Optimistic - server will correct
      { textAnswer }
    );

    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
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
        correctAnswer: question.correctAnswer,
        alternativeAnswers: question.alternativeAnswers,
        caseSensitive: question.caseSensitive,
        allowTypos: question.allowTypos,
      });

      const { points: actualPoints, newScore, isCorrect, currentStreak, rank, totalPlayers } = result.data;
      setRankInfo?.({ rank, totalPlayers });

      // Always update with server values for free-response (fuzzy matching)
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
        return { ...p, score: newScore, currentStreak: currentStreak ?? 0, answers: updatedAnswers };
      });
    } catch (error: any) {
      handleSubmissionError(error, toast);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer, setRankInfo]);

  // Submit poll single choice answer (no scoring)
  const submitPollSingle = useCallback(async (
    answerIndex: number,
    question: PollSingleQuestion,
    timeRemaining: number,
    _timeLimit: number
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

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

  // Handle timeout
  const submitTimeout = useCallback(async (
    question: SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion
  ) => {
    if (!gameDocId || answerSubmittedRef.current) return;

    // Slides don't timeout - players just view them
    if (question.type === 'slide') {
      console.log('[Timeout] Skipping timeout for slide question');
      return;
    }

    answerSubmittedRef.current = true;

    const submitData: any = {
      gameId: gameDocId,
      playerId,
      questionIndex: currentQuestionIndex,
      timeRemaining: 0,
      questionType: question.type,
      questionTimeLimit: question.timeLimit,
    };

    // Add appropriate field based on question type
    switch (question.type) {
      case 'single-choice':
        submitData.answerIndex = -1;
        submitData.correctAnswerIndex = question.correctAnswerIndex;
        break;
      case 'multiple-choice':
        submitData.answerIndices = [];
        submitData.correctAnswerIndices = question.correctAnswerIndices;
        break;
      case 'slider':
        submitData.sliderValue = question.minValue;
        submitData.correctValue = question.correctValue;
        submitData.minValue = question.minValue;
        submitData.maxValue = question.maxValue;
        break;
      case 'free-response':
        submitData.textAnswer = '';
        submitData.correctAnswer = question.correctAnswer;
        submitData.alternativeAnswers = question.alternativeAnswers;
        submitData.caseSensitive = question.caseSensitive;
        submitData.allowTypos = question.allowTypos;
        break;
      case 'poll-single':
        submitData.answerIndex = -1;
        break;
      case 'poll-multiple':
        submitData.answerIndices = [];
        break;
    }

    try {
      const submitAnswerFn = httpsCallable<typeof submitData, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { rank, totalPlayers } = result.data;
      setRankInfo?.({ rank, totalPlayers });
    } catch (error: any) {
      console.error('Error submitting timeout:', error);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, setRankInfo, answerSubmittedRef]);

  return {
    submitSingleChoice,
    submitMultipleChoice,
    submitSlider,
    submitFreeResponse,
    submitPollSingle,
    submitPollMultiple,
    submitTimeout
  };
}
