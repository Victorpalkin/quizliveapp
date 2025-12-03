import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { GameAnalytics, Game, Quiz } from '@/lib/types';

/**
 * Hook to fetch game analytics data.
 * Analytics are pre-computed and stored at games/{gameId}/aggregates/analytics
 */
export function useGameAnalytics(gameId: string) {
  const firestore = useFirestore();

  // Game document (for basic info and host verification)
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Quiz document (for title if needed)
  const quizRef = useMemoFirebase(
    () => game ? doc(firestore, 'quizzes', game.quizId) : null,
    [firestore, game]
  );
  const { data: quiz, loading: quizLoading } = useDoc(quizRef);

  // Analytics aggregate document
  const analyticsRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'analytics') as DocumentReference<GameAnalytics>,
    [firestore, gameId]
  );
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useDoc(analyticsRef);

  return {
    game,
    quiz,
    analytics,
    loading: gameLoading || quizLoading || analyticsLoading,
    analyticsLoading,
    analyticsExists: analytics !== null,
    error: analyticsError,
  };
}
