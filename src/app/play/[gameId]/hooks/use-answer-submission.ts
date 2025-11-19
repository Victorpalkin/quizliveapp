import { useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { useFirestore, useFunctions } from '@/firebase';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type { Player, PlayerAnswer, SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion, PollSingleQuestion, PollMultipleQuestion, SubmitAnswerResponse } from '@/lib/types';
import { calculateTimeBasedScore, calculateProportionalScore, calculateSliderScore } from '@/lib/scoring';

type AnswerResult = {
  selected: number;
  correct: number[];
  points: number;
  wasTimeout: boolean;
  isPartiallyCorrect?: boolean;
};

export function useAnswerSubmission(
  gameDocId: string | null,
  playerId: string,
  currentQuestionIndex: number,
  player: Player | null,
  setLastAnswer: Dispatch<SetStateAction<AnswerResult | null>>,
  setPlayer: Dispatch<SetStateAction<Player | null>>,
  answerSubmittedRef: React.MutableRefObject<boolean>
) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();

  // Submit single choice answer
  const submitSingleChoice = useCallback(async (
    answerIndex: number,
    question: SingleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId) return;

    answerSubmittedRef.current = true;

    // Optimistic UI: Calculate estimated points using scoring utility
    const isCorrectAnswer = answerIndex === question.correctAnswerIndex;
    const estimatedPoints = calculateTimeBasedScore(isCorrectAnswer, timeRemaining, timeLimit);

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: answerIndex,
      correct: [question.correctAnswerIndex],
      points: estimatedPoints,
      wasTimeout: false
    });

    // Optimistic update: add answer to array
    const optimisticAnswer: PlayerAnswer = {
      questionIndex: currentQuestionIndex,
      questionType: 'single-choice',
      timestamp: Timestamp.now(),
      answerIndex,
      points: estimatedPoints,
      isCorrect: isCorrectAnswer,
      wasTimeout: false
    };
    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      answerIndex,
      timeRemaining,
      questionType: 'single-choice' as const,
      questionTimeLimit: question.timeLimit,
      correctAnswerIndex: question.correctAnswerIndex,
    };

    try {
      const submitAnswerFn = httpsCallable<typeof submitData, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore } = result.data;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
        // Update answer in array with actual points
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore } : null);
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit multiple choice answer
  const submitMultipleChoice = useCallback(async (
    answerIndices: number[],
    question: MultipleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId) return;

    answerSubmittedRef.current = true;

    // Optimistic UI: Calculate estimated points using scoring utility
    const correctAnswerIndices = question.correctAnswerIndices;
    const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
    const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
    const totalCorrect = correctAnswerIndices.length;

    const estimatedPoints = calculateProportionalScore(
      correctSelected,
      wrongSelected,
      totalCorrect,
      timeRemaining,
      timeLimit
    );

    const isCorrectAnswer = correctSelected === totalCorrect && wrongSelected === 0;
    const isPartiallyCorrectAnswer = !isCorrectAnswer && estimatedPoints > 0;

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false,
      isPartiallyCorrect: isPartiallyCorrectAnswer
    });

    // Optimistic update: add answer to array
    const optimisticAnswer: PlayerAnswer = {
      questionIndex: currentQuestionIndex,
      questionType: 'multiple-choice',
      timestamp: Timestamp.now(),
      answerIndices,
      points: estimatedPoints,
      isCorrect: isCorrectAnswer,
      wasTimeout: false
    };
    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      answerIndices,
      timeRemaining,
      questionType: 'multiple-choice' as const,
      questionTimeLimit: question.timeLimit,
      correctAnswerIndices: question.correctAnswerIndices,
    };

    try {
      const submitAnswerFn = httpsCallable<typeof submitData, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore, isPartiallyCorrect } = result.data;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints || isPartiallyCorrect !== isPartiallyCorrectAnswer) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints, isPartiallyCorrect } : null);
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore } : null);
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit slider answer
  const submitSlider = useCallback(async (
    sliderValue: number,
    question: SliderQuestion,
    timeRemaining: number
  ) => {
    if (!gameDocId) return;

    answerSubmittedRef.current = true;

    // Optimistic UI: Calculate estimated points using scoring utility
    const { points: estimatedPoints, isCorrect: isCorrectAnswer } = calculateSliderScore(
      sliderValue,
      question.correctValue,
      question.minValue,
      question.maxValue,
      timeRemaining,
      question.timeLimit || 20,
      question.acceptableError
    );

    // Show result immediately (optimistic) - no "partially correct" for sliders
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false
    });

    // Optimistic update: add answer to array
    const optimisticAnswer: PlayerAnswer = {
      questionIndex: currentQuestionIndex,
      questionType: 'slider',
      timestamp: Timestamp.now(),
      sliderValue,
      points: estimatedPoints,
      isCorrect: isCorrectAnswer,
      wasTimeout: false
    };
    setPlayer(p => p ? {
      ...p,
      score: p.score + estimatedPoints,
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      sliderValue,
      timeRemaining,
      questionType: 'slider' as const,
      questionTimeLimit: question.timeLimit,
      correctValue: question.correctValue,
      minValue: question.minValue,
      maxValue: question.maxValue,
      acceptableError: question.acceptableError,
    };

    try {
      const submitAnswerFn = httpsCallable<typeof submitData, SubmitAnswerResponse>(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore } = result.data;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
        setPlayer(p => {
          if (!p) return null;
          const updatedAnswers = p.answers.map(a =>
            a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints } : a
          );
          return { ...p, score: newScore, answers: updatedAnswers };
        });
      } else {
        setPlayer(p => p ? { ...p, score: newScore } : null);
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Handle timeout
  const submitTimeout = useCallback(async (
    question: SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | PollSingleQuestion | PollMultipleQuestion
  ) => {
    if (!gameDocId) return;

    // Slides don't timeout - players just view them
    if (question.type === 'slide') {
      console.log('[Timeout] Skipping timeout for slide question');
      return;
    }

    const submitData: any = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      timeRemaining: 0,
      questionType: question.type,
      questionTimeLimit: question.timeLimit,
    };

    // Add appropriate field based on question type
    if (question.type === 'single-choice') {
      submitData.answerIndex = -1;
      submitData.correctAnswerIndex = question.correctAnswerIndex;
    } else if (question.type === 'multiple-choice') {
      submitData.answerIndices = [];
      submitData.correctAnswerIndices = question.correctAnswerIndices;
    } else if (question.type === 'slider') {
      submitData.sliderValue = question.minValue;
      submitData.correctValue = question.correctValue;
      submitData.minValue = question.minValue;
      submitData.maxValue = question.maxValue;
    } else if (question.type === 'poll-single') {
      submitData.answerIndex = -1; // -1 represents no answer/timeout
    } else if (question.type === 'poll-multiple') {
      submitData.answerIndices = []; // Empty array represents no answer/timeout
    }

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn(submitData);
    } catch (error: any) {
      console.error('Error submitting timeout:', error);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions]);

  // Submit poll single choice answer (no scoring)
  const submitPollSingle = useCallback(async (
    answerIndex: number,
    question: PollSingleQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId) return;

    answerSubmittedRef.current = true;

    // Poll questions don't have correct answers - always 0 points
    setLastAnswer({
      selected: answerIndex,
      correct: [], // No correct answer for polls
      points: 0,
      wasTimeout: false
    });

    // Optimistic update: add answer to array
    const optimisticAnswer: PlayerAnswer = {
      questionIndex: currentQuestionIndex,
      questionType: 'poll-single',
      timestamp: Timestamp.now(),
      answerIndex,
      points: 0,
      isCorrect: false, // Polls don't have correct answers
      wasTimeout: false
    };
    setPlayer(p => p ? {
      ...p,
      score: p.score, // No score change for polls
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      answerIndex,
      timeRemaining,
      questionType: 'poll-single' as const,
      questionTimeLimit: question.timeLimit,
    };

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn(submitData);
    } catch (error: any) {
      console.error('Error submitting poll answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit poll response.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit poll multiple choice answer (no scoring)
  const submitPollMultiple = useCallback(async (
    answerIndices: number[],
    question: PollMultipleQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    if (!gameDocId) return;

    answerSubmittedRef.current = true;

    // Poll questions don't have correct answers - always 0 points
    setLastAnswer({
      selected: 0, // For polls, selected doesn't matter
      correct: [], // No correct answer for polls
      points: 0,
      wasTimeout: false
    });

    // Optimistic update: add answer to array
    const optimisticAnswer: PlayerAnswer = {
      questionIndex: currentQuestionIndex,
      questionType: 'poll-multiple',
      timestamp: Timestamp.now(),
      answerIndices,
      points: 0,
      isCorrect: false, // Polls don't have correct answers
      wasTimeout: false
    };
    setPlayer(p => p ? {
      ...p,
      score: p.score, // No score change for polls
      answers: [...(p.answers || []), optimisticAnswer]
    } : null);

    // Submit to server in background
    const submitData = {
      gameId: gameDocId,
      playerId: playerId,
      questionIndex: currentQuestionIndex,
      answerIndices,
      timeRemaining,
      questionType: 'poll-multiple' as const,
      questionTimeLimit: question.timeLimit,
    };

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn(submitData);
    } catch (error: any) {
      console.error('Error submitting poll answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit poll response.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  return {
    submitSingleChoice,
    submitMultipleChoice,
    submitSlider,
    submitPollSingle,
    submitPollMultiple,
    submitTimeout
  };
}
