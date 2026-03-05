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
 * Configuration for a type-specific answer submission
 */
interface SubmissionConfig {
  questionType: QuestionType;
  answerData: Partial<PlayerAnswer>;
  optimisticAnswer: AnswerResult;
  serverPayloadExtra: Record<string, any>;
  isPoll: boolean;
  processResponse?: (data: SubmitAnswerResponse) => {
    lastAnswer: Partial<AnswerResult>;
    playerUpdate: (p: Player) => Player;
  };
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

  /**
   * Generic answer submission handler that contains all shared logic:
   * guard clause, analytics, optimistic UI, Cloud Function call, response handling, error handling.
   */
  const submitAnswerGeneric = useCallback(async (config: SubmissionConfig) => {
    if (!gameDocId || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Track answer submission
    trackEvent('answer_submitted', {
      question_type: config.questionType,
      has_time_bonus: !config.isPoll && (config.serverPayloadExtra.timeRemaining > 0),
    });

    // Optimistic UI update
    setLastAnswer(config.optimisticAnswer);

    const optimisticAnswer = createOptimisticAnswer(
      currentQuestionIndex,
      config.questionType,
      0,
      false,
      config.answerData
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
        questionType: config.questionType,
        ...config.serverPayloadExtra,
      });

      // Process server response (scored questions update score/correctness; polls skip)
      if (!config.isPoll && config.processResponse) {
        const { lastAnswer, playerUpdate } = config.processResponse(result.data);
        setLastAnswer(prev => prev ? { ...prev, ...lastAnswer } : null);
        setPlayer(p => p ? playerUpdate(p) : null);
      }
    } catch (error: any) {
      handleSubmissionError(error, toast, config.isPoll);
    }
  }, [gameDocId, playerId, currentQuestionIndex, functions, toast, answerSubmittedRef, setLastAnswer, setPlayer]);

  /**
   * Standard response processor for scored questions.
   * Updates lastAnswer and player score/answers based on server response.
   */
  const processScoredResponse = (
    answerCorrectMapper: (data: SubmitAnswerResponse) => Partial<AnswerResult>
  ) => (data: SubmitAnswerResponse) => {
    const { points: actualPoints, newScore, isCorrect } = data;
    return {
      lastAnswer: {
        points: actualPoints,
        ...answerCorrectMapper(data),
      },
      playerUpdate: (p: Player) => {
        const updatedAnswers = p.answers.map(a =>
          a.questionIndex === currentQuestionIndex ? { ...a, points: actualPoints, isCorrect } : a
        );
        return { ...p, score: newScore, answers: updatedAnswers };
      },
    };
  };

  // Submit single choice answer
  const submitSingleChoice = useCallback(async (
    answerIndex: number,
    question: SingleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'single-choice',
      answerData: { answerIndex },
      optimisticAnswer: { selected: answerIndex, correct: [], points: 0, wasTimeout: false },
      serverPayloadExtra: { answerIndex, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: false,
      processResponse: processScoredResponse(({ isCorrect }) => ({
        correct: isCorrect ? [answerIndex] : [],
      })),
    });
  }, [submitAnswerGeneric]);

  // Submit multiple choice answer
  const submitMultipleChoice = useCallback(async (
    answerIndices: number[],
    question: MultipleChoiceQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'multiple-choice',
      answerData: { answerIndices },
      optimisticAnswer: { selected: 0, correct: [1], points: 0, wasTimeout: false, isPartiallyCorrect: false },
      serverPayloadExtra: { answerIndices, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: false,
      processResponse: processScoredResponse(({ isCorrect, isPartiallyCorrect: serverPartiallyCorrect }) => ({
        selected: isCorrect ? 1 : 0,
        isPartiallyCorrect: serverPartiallyCorrect,
      })),
    });
  }, [submitAnswerGeneric]);

  // Submit slider answer
  const submitSlider = useCallback(async (
    sliderValue: number,
    question: SliderQuestion,
    timeRemaining: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'slider',
      answerData: { sliderValue },
      optimisticAnswer: { selected: 0, correct: [1], points: 0, wasTimeout: false },
      serverPayloadExtra: { sliderValue, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: false,
      processResponse: processScoredResponse(({ isCorrect }) => ({
        selected: isCorrect ? 1 : 0,
      })),
    });
  }, [submitAnswerGeneric]);

  // Submit free-response answer
  const submitFreeResponse = useCallback(async (
    textAnswer: string,
    question: FreeResponseQuestion,
    timeRemaining: number,
    timeLimit: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'free-response',
      answerData: { textAnswer },
      optimisticAnswer: { selected: 0, correct: [1], points: 0, wasTimeout: false },
      serverPayloadExtra: { textAnswer, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: false,
      processResponse: processScoredResponse(({ isCorrect }) => ({
        selected: isCorrect ? 1 : 0,
      })),
    });
  }, [submitAnswerGeneric]);

  // Submit poll single choice answer (no scoring)
  const submitPollSingle = useCallback(async (
    answerIndex: number,
    question: PollSingleQuestion,
    timeRemaining: number,
    _timeLimit: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'poll-single',
      answerData: { answerIndex },
      optimisticAnswer: { selected: answerIndex, correct: [], points: 0, wasTimeout: false },
      serverPayloadExtra: { answerIndex, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: true,
    });
  }, [submitAnswerGeneric]);

  // Submit poll multiple choice answer (no scoring)
  const submitPollMultiple = useCallback(async (
    answerIndices: number[],
    question: PollMultipleQuestion,
    timeRemaining: number,
    _timeLimit: number
  ) => {
    await submitAnswerGeneric({
      questionType: 'poll-multiple',
      answerData: { answerIndices },
      optimisticAnswer: { selected: 0, correct: [], points: 0, wasTimeout: false },
      serverPayloadExtra: { answerIndices, timeRemaining, questionTimeLimit: question.timeLimit },
      isPoll: true,
    });
  }, [submitAnswerGeneric]);

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
