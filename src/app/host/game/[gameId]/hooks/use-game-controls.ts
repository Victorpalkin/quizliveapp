import { useCallback, useState } from 'react';
import { updateDoc, serverTimestamp, DocumentReference, Timestamp, doc, getFirestore } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFunctions } from '@/firebase';
import type { Game, Quiz } from '@/lib/types';
import { isLastQuestion as checkIsLastQuestion } from '@/lib/utils/game-utils';
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

  // Reset leaderboard aggregate for new question (clear answerCounts and totalAnswered)
  const resetLeaderboardForNewQuestion = useCallback(async () => {
    if (!gameRef) return;
    const firestore = getFirestore();
    const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
    try {
      await updateDoc(leaderboardRef, {
        answerCounts: [],
        totalAnswered: 0,
      });
    } catch (error) {
      // If document doesn't exist yet, that's fine - it will be created on first answer
      console.log('[Leaderboard] Reset skipped - aggregate may not exist yet');
    }
  }, [gameRef, gameId]);

  // Transition from question to leaderboard and compute results
  // Results (topPlayers, answerCounts) are computed once when question ends
  // This is much faster than computing on every answer submission
  const finishQuestion = useCallback(async () => {
    if (!game) return;

    // First transition to leaderboard state (immediate feedback)
    updateGame({ state: 'leaderboard' });

    // Then compute results in the background
    setIsComputingResults(true);
    setComputeError(null);
    try {
      const computeResults = httpsCallable(functions, 'computeQuestionResults');
      await computeResults({
        gameId,
        questionIndex: game.currentQuestionIndex,
      });
    } catch (error: any) {
      console.error('[Game Controls] Error computing results:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error computing results';
      setComputeError(errorMessage);
    } finally {
      setIsComputingResults(false);
    }
  }, [game, gameId, functions, updateGame]);

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
        setIsComputingResults(true);
        setComputeError(null);
        try {
          const computeResults = httpsCallable(functions, 'computeQuestionResults');
          await computeResults({
            gameId,
            questionIndex: game.currentQuestionIndex,
          });
        } catch (error: any) {
          console.error('[Game Controls] Error computing final results:', error);
          // Don't block game end on error - just log it
        } finally {
          setIsComputingResults(false);
        }
        updateGame({ state: 'ended' });
      }
    }
  }, [game, quiz, gameRef, gameId, functions, updateGame, resetLeaderboardForNewQuestion]);

  // Transition from preparing to question
  // Note: Caller is responsible for checking state - no internal check needed
  // This keeps the callback stable and avoids circular dependencies
  const startQuestion = useCallback(() => {
    updateGame({
      state: 'question',
      questionStartTime: serverTimestamp() as unknown as Timestamp
    });
  }, [updateGame]);

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
