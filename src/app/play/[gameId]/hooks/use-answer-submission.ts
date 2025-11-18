import { useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { useFirestore, useFunctions } from '@/firebase';
import { doc, setDoc, DocumentReference } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type { Player, SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion } from '@/lib/types';

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

    // Optimistic UI: Calculate estimated points
    const isCorrectAnswer = answerIndex === question.correctAnswerIndex;
    let estimatedPoints = 0;
    if (isCorrectAnswer) {
      estimatedPoints = 100;
      const timeBonus = Math.round((timeRemaining / timeLimit) * 900);
      estimatedPoints = Math.min(1000, estimatedPoints + timeBonus);
    }

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: answerIndex,
      correct: [question.correctAnswerIndex],
      points: estimatedPoints,
      wasTimeout: false
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastAnswerIndex: answerIndex } : null);

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
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndex: answerIndex } : null);
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

    // Optimistic UI: Calculate estimated points
    const correctAnswerIndices = question.correctAnswerIndices;
    const correctSelected = answerIndices.filter(i => correctAnswerIndices.includes(i)).length;
    const wrongSelected = answerIndices.filter(i => !correctAnswerIndices.includes(i)).length;
    const totalCorrect = correctAnswerIndices.length;

    const correctRatio = correctSelected / totalCorrect;
    const penalty = wrongSelected * 0.2;
    const scoreMultiplier = Math.max(0, correctRatio - penalty);
    const basePoints = Math.round(1000 * scoreMultiplier);

    const isCorrectAnswer = correctSelected === totalCorrect && wrongSelected === 0;
    const isPartiallyCorrectAnswer = !isCorrectAnswer && scoreMultiplier > 0;

    let estimatedPoints = basePoints;
    if (isCorrectAnswer && estimatedPoints > 0) {
      const timeBonus = Math.round((timeRemaining / timeLimit) * 900);
      estimatedPoints = Math.min(1000, estimatedPoints + timeBonus);
    }

    // Show result immediately (optimistic)
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false,
      isPartiallyCorrect: isPartiallyCorrectAnswer
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastAnswerIndices: answerIndices } : null);

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
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore, isPartiallyCorrect } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      if (isPartiallyCorrect !== isPartiallyCorrectAnswer) {
        setLastAnswer(prev => prev ? { ...prev, isPartiallyCorrect } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastAnswerIndices: answerIndices } : null);
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

    // Optimistic UI: Calculate estimated points (50/50 accuracy/speed)
    const range = question.maxValue - question.minValue;
    const distance = Math.abs(sliderValue - question.correctValue);
    const accuracy = Math.max(0, 1 - (distance / range));

    const scoreMultiplier = Math.pow(accuracy, 2);
    const accuracyComponent = Math.round(500 * scoreMultiplier);
    const speedComponent = Math.round(500 * (timeRemaining / (question.timeLimit || 20)));
    const estimatedPoints = accuracyComponent + speedComponent;

    // Configurable acceptable error threshold (default: 5% of range)
    const threshold = question.acceptableError ?? (range * 0.05);
    const isCorrectAnswer = distance <= threshold;

    // Show result immediately (optimistic) - no "partially correct" for sliders
    setLastAnswer({
      selected: isCorrectAnswer ? 1 : 0,
      correct: [1],
      points: estimatedPoints,
      wasTimeout: false
    });
    setPlayer(p => p ? { ...p, score: p.score + estimatedPoints, lastSliderValue: sliderValue } : null);

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
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      const result = await submitAnswerFn(submitData);
      const { points: actualPoints, newScore } = result.data as any;

      // Update with actual values if different
      if (actualPoints !== estimatedPoints) {
        setLastAnswer(prev => prev ? { ...prev, points: actualPoints } : null);
      }
      setPlayer(p => p ? { ...p, score: newScore, lastSliderValue: sliderValue } : null);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit answer. Your score may not be saved.' });
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Submit slide view (no scoring)
  const submitSlideView = useCallback(() => {
    if (!gameDocId || !player) return;

    answerSubmittedRef.current = true;

    // Show "No Answer" result with 0 points (like timeout but informational)
    setLastAnswer({
      selected: -1,
      correct: [-1],
      points: 0,
      wasTimeout: false
    });

    // Update player state locally - mark as viewed with lastAnswerIndex = -1
    const playerRef = doc(firestore, 'games', gameDocId, 'players', playerId) as DocumentReference<Player>;
    setDoc(playerRef, { ...player, lastAnswerIndex: -1 }, { merge: true }).catch(error => {
      console.error("Error marking slide as viewed:", error);
    });
    setPlayer(p => p ? { ...p, lastAnswerIndex: -1 } : null);
  }, [gameDocId, playerId, player, firestore, answerSubmittedRef, setLastAnswer, setPlayer]);

  // Handle timeout
  const submitTimeout = useCallback(async (
    question: SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion
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
    }

    try {
      const submitAnswerFn = httpsCallable(functions, 'submitAnswer');
      await submitAnswerFn(submitData);
    } catch (error: any) {
      console.error('Error submitting timeout:', error);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions]);

  return {
    submitSingleChoice,
    submitMultipleChoice,
    submitSlider,
    submitSlideView,
    submitTimeout
  };
}
