import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { Game, Quiz } from '@/lib/types';
import { useLeaderboard } from './use-leaderboard';

/**
 * Host game state hook.
 *
 * Uses aggregate document for leaderboard data instead of subscribing to
 * all player documents. This reduces Firestore reads from O(n) to O(1)
 * and eliminates the "update storm" problem with 500+ players.
 */
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

  // Leaderboard aggregate (top 20 + answer counts + totals)
  // Replaces the expensive useCollection subscription to all players
  const { topPlayers, totalPlayers, totalAnswered, answerCounts, loading: leaderboardLoading } = useLeaderboard(gameId);

  return {
    game,
    gameRef,
    quiz,
    // Leaderboard data from aggregate (O(1) instead of O(n))
    topPlayers,       // Top 20 players (show 10 during game, 20 at end)
    totalPlayers,     // Total player count
    totalAnswered,    // How many answered current question
    answerCounts,     // Answer distribution for current question
    gameLoading,
    quizLoading,
    leaderboardLoading,
  };
}
