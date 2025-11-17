import { useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { updateDoc, writeBatch, doc, serverTimestamp, DocumentReference, Timestamp } from 'firebase/firestore';
import type { Game, Quiz, Player } from '@/lib/types';
import { isLastQuestion as checkIsLastQuestion } from '@/lib/utils/game-utils';
import { handleFirestoreError } from '@/lib/utils/error-utils';

export function useGameControls(
  gameId: string,
  gameRef: DocumentReference<Game> | null,
  game: Game | null,
  quiz: Quiz | null,
  players: Player[]
) {
  const firestore = useFirestore();

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

  const finishQuestion = useCallback(() => {
    if (game?.state === 'question') {
      updateGame({ state: 'leaderboard' });
    }
  }, [game?.state, updateGame]);

  const handleNext = useCallback(async () => {
    if (!game || !quiz || !gameRef || !players) return;

    const isLast = checkIsLastQuestion(game, quiz);

    if (game.state === 'question') {
      updateGame({ state: 'leaderboard' });
    } else if (game.state === 'leaderboard') {
      if (!isLast) {
        const batch = writeBatch(firestore);
        players.forEach(player => {
          const playerRef = doc(firestore, 'games', gameId, 'players', player.id);
          batch.update(playerRef, {
            lastAnswerIndex: null,
            lastAnswerIndices: null,
            lastSliderValue: null
          });
        });
        await batch.commit();

        updateGame({
          state: 'preparing',
          currentQuestionIndex: game.currentQuestionIndex + 1
        });
      } else {
        updateGame({ state: 'ended' });
      }
    }
  }, [game, quiz, gameRef, players, firestore, gameId, updateGame]);

  // Transition from preparing to question
  const startQuestion = useCallback(() => {
    if (game?.state === 'preparing') {
      updateGame({
        state: 'question',
        questionStartTime: serverTimestamp() as unknown as Timestamp
      });
    }
  }, [game?.state, updateGame]);

  const isLastQuestion = checkIsLastQuestion(game, quiz);

  return {
    finishQuestion,
    handleNext,
    startQuestion,
    isLastQuestion
  };
}
