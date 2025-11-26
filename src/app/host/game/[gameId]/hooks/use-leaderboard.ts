import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { GameLeaderboard } from '@/lib/types';

/**
 * Hook to subscribe to the leaderboard aggregate document.
 * This replaces the O(n) player collection subscription with O(1) document access.
 *
 * The aggregate is maintained server-side by the submitAnswer Cloud Function.
 */
export function useLeaderboard(gameId: string) {
  const firestore = useFirestore();

  const leaderboardRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'leaderboard') as DocumentReference<GameLeaderboard>,
    [firestore, gameId]
  );

  const { data: leaderboard, loading } = useDoc(leaderboardRef);

  return {
    topPlayers: leaderboard?.topPlayers || [],
    totalPlayers: leaderboard?.totalPlayers || 0,
    totalAnswered: leaderboard?.totalAnswered || 0,
    answerCounts: leaderboard?.answerCounts || [],
    loading,
  };
}
