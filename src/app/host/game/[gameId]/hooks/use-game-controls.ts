import { useCallback } from 'react';
import { updateDoc, serverTimestamp, DocumentReference, Timestamp } from 'firebase/firestore';
import type { Game, Quiz } from '@/lib/types';
import { isLastQuestion as checkIsLastQuestion } from '@/lib/utils/game-utils';
import { handleFirestoreError } from '@/lib/utils/error-utils';

export function useGameControls(
  gameId: string,
  gameRef: DocumentReference<Game> | null,
  game: Game | null,
  quiz: Quiz | null,
  players: any[] // Not used anymore but keeping for API compatibility
) {

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

  // Transition from question to leaderboard
  // Note: Caller is responsible for checking state - no internal check needed
  // This keeps the callback stable and avoids unnecessary re-renders
  const finishQuestion = useCallback(() => {
    updateGame({ state: 'leaderboard' });
  }, [updateGame]);

  const handleNext = useCallback(async () => {
    if (!game || !quiz || !gameRef) return;

    const isLast = checkIsLastQuestion(game, quiz);

    if (game.state === 'question') {
      updateGame({ state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (!isLast) {
        // No cleanup needed - answers persist in array
        updateGame({
          state: 'preparing',
          currentQuestionIndex: game.currentQuestionIndex + 1
        });
      } else {
        updateGame({ state: 'ended' });
      }
    }
  }, [game, quiz, gameRef, updateGame]);

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
    isLastQuestion
  };
}
