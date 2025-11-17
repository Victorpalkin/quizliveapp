import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, DocumentReference, Query, DocumentData } from 'firebase/firestore';
import type { Game, Quiz, Player } from '@/lib/types';

export function useGameState(gameId: string) {
  const firestore = useFirestore();

  // Game document
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Quiz document
  const quizRef = useMemoFirebase(
    () => game ? doc(firestore, 'quizzes', game.quizId) : null,
    [firestore, game]
  );
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);
  const quiz = quizData as Quiz | null;

  // Players collection
  const playersQuery = useMemoFirebase(
    () => collection(firestore, 'games', gameId, 'players') as Query<Player, DocumentData>,
    [firestore, gameId]
  );
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);

  return {
    game,
    gameRef,
    quiz,
    players: players || [],
    gameLoading,
    quizLoading,
    playersLoading
  };
}
