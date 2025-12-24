import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { GameLeaderboard } from '@/lib/types';

/**
 * Hook to subscribe to the leaderboard aggregate document for presentations.
 * The aggregate is maintained server-side and created when presentation starts.
 *
 * @param gameId - The presentation game ID
 */
export function usePresentationLeaderboard(gameId: string) {
  const firestore = useFirestore();

  const leaderboardRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'leaderboard') as DocumentReference<GameLeaderboard>,
    [firestore, gameId]
  );

  const { data: leaderboard, loading } = useDoc(leaderboardRef);

  return {
    topPlayers: leaderboard?.topPlayers || [],
    totalPlayers: leaderboard?.totalPlayers || 0,
    playerRanks: leaderboard?.playerRanks || {},
    loading,
  };
}
