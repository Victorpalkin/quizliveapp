import { useCallback, useState } from 'react';
import { updateDoc, serverTimestamp, DocumentReference, Timestamp, doc, getFirestore } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFunctions, trackEvent } from '@/firebase';
import type { Game, Quiz } from '@/lib/types';
import { isLastQuestion as checkIsLastQuestion, getEffectiveQuestions } from '@/lib/utils/game-utils';
import { handleFirestoreError } from '@/lib/utils/error-utils';

export function useGameControls(
  gameId: string,
  gameRef: DocumentReference<Game> | null,
  game: Game | null,
  quiz: Quiz | null
) {
  const functions = useFunctions();
  const [isComputingResults, setIsComputingResults] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  const updateGame = useCallback((data: Partial<Game>) => {
    if (!gameRef) return;
    updateDoc(gameRef, data).catch(error =>
      handleFirestoreError(error, {
        path: gameRef.path,
        operation: 'update',
        requestResourceData: data,
      }, "Error updating game: ")
    );
  }, [gameRef]);

  // Reset leaderboard aggregate for new question (clear answerCounts, liveAnswerCounts, and totalAnswered)
  const resetLeaderboardForNewQuestion = useCallback(async () => {
    if (!gameRef) return;
    const firestore = getFirestore();
    const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
    try {
      await updateDoc(leaderboardRef, {
        answerCounts: [],
        liveAnswerCounts: {},  // Clear real-time answer counts for new question
        totalAnswered: 0,
      });
    } catch (error) {
      // If document doesn't exist yet, that's fine - it will be created on first answer
      console.log('[Leaderboard] Reset skipped - aggregate may not exist yet');
    }
  }, [gameRef, gameId]);

  // Transition from question to leaderboard and compute results
  // Results (topPlayers, answerCounts, playerRanks, playerStreaks) are computed once when question ends
  // This is much faster than computing on every answer submission
  //
  // IMPORTANT: Compute results BEFORE changing state to 'leaderboard'
  // This ensures players see correct rank/streak data when they transition to result screen
  const finishQuestion = useCallback(async () => {
    if (!game || !quiz) return;

    // Show loading indicator on host side (while still in 'question' state)
    setIsComputingResults(true);
    setComputeError(null);

    try {
      // Compute results FIRST (players still see question/waiting screen)
      const computeResults = httpsCallable(functions, 'computeQuestionResults');
      const effectiveQuestions = getEffectiveQuestions(game, quiz);
      await computeResults({
        gameId,
        questionIndex: game.currentQuestionIndex,
        questionType: effectiveQuestions[game.currentQuestionIndex]?.type || 'single-choice',
      });

      // THEN transition to leaderboard (players now see correct data)
      updateGame({ state: 'leaderboard' });
    } catch (error: any) {
      console.error('[Game Controls] Error computing results:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error computing results';
      setComputeError(errorMessage);
      // Still transition to leaderboard so host can see error and retry
      updateGame({ state: 'leaderboard' });
    } finally {
      setIsComputingResults(false);
    }
  }, [game, quiz, gameId, functions, updateGame]);

  const handleNext = useCallback(async () => {
    if (!game || !quiz || !gameRef) return;

    const isLast = checkIsLastQuestion(game, quiz);

    if (game.state === 'question') {
      updateGame({ state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (!isLast) {
        // Reset leaderboard answer counts for new question
        await resetLeaderboardForNewQuestion();
        updateGame({
          state: 'preparing',
          currentQuestionIndex: game.currentQuestionIndex + 1
        });
      } else {
        // Re-compute final results to ensure accuracy
        // This catches any last-second answers that may have been submitted
        // Note: computeQuestionResults is idempotent - safe to call multiple times
        setIsComputingResults(true);
        setComputeError(null);
        try {
          const computeResults = httpsCallable(functions, 'computeQuestionResults');
          const effectiveQuestions = getEffectiveQuestions(game, quiz);
          await computeResults({
            gameId,
            questionIndex: game.currentQuestionIndex,
            questionType: effectiveQuestions[game.currentQuestionIndex]?.type || 'single-choice',
          });
        } catch (error: any) {
          console.error('[Game Controls] Error computing final results:', error);
          // Don't block game end on error - just log it
        } finally {
          setIsComputingResults(false);
        }

        // Track game ended
        trackEvent('game_ended', {
          question_count: getEffectiveQuestions(game, quiz).length,
        });

        updateGame({ state: 'ended' });
      }
    }
  }, [game, quiz, gameRef, gameId, functions, updateGame, resetLeaderboardForNewQuestion]);

  // Transition from preparing to question
  // Note: Caller is responsible for checking state - no internal check needed
  // This keeps the callback stable and avoids circular dependencies
  const startQuestion = useCallback(() => {
    if (!game || !quiz) return;

    const questions = getEffectiveQuestions(game, quiz);
    const questionIndex = game.currentQuestionIndex;
    const question = questions[questionIndex];

    // Track question started
    trackEvent('question_started', {
      question_index: questionIndex,
      question_type: question?.type,
    });

    // Track game started on first question
    if (questionIndex === 0) {
      trackEvent('game_started', {
        question_count: questions.length,
      });
    }

    updateGame({
      state: 'question',
      questionStartTime: serverTimestamp() as unknown as Timestamp
    });
  }, [updateGame, game, quiz]);

  const isLastQuestion = checkIsLastQuestion(game, quiz);

  return {
    finishQuestion,
    handleNext,
    startQuestion,
    isLastQuestion,
    isComputingResults,
    computeError,
  };
}
