import { useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { GameLeaderboard } from '@/lib/types';

/**
 * Hook to subscribe to the leaderboard aggregate document.
 * This replaces the O(n) player collection subscription with O(1) document access.
 *
 * The aggregate is maintained server-side by the submitAnswer Cloud Function.
 *
 * answerCounts behavior:
 * - During question: Uses liveAnswerCounts (real-time atomic increments)
 * - After question (leaderboard): Uses answerCounts (accurate counts from computeQuestionResults)
 */
export function useLeaderboard(gameId: string) {
  const firestore = useFirestore();

  const leaderboardRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'leaderboard') as DocumentReference<GameLeaderboard>,
    [firestore, gameId]
  );

  const { data: leaderboard, loading } = useDoc(leaderboardRef);

  // Convert liveAnswerCounts map to array, or fall back to answerCounts
  const answerCounts = useMemo(() => {
    const liveAnswerCounts = leaderboard?.liveAnswerCounts;
    const staticAnswerCounts = leaderboard?.answerCounts || [];

    // If we have live answer counts, convert map to array
    if (liveAnswerCounts && Object.keys(liveAnswerCounts).length > 0) {
      // Find the maximum index to determine array size
      const maxIndex = Math.max(...Object.keys(liveAnswerCounts).map(Number));
      const result: number[] = new Array(maxIndex + 1).fill(0);

      // Populate array from map
      for (const [indexStr, count] of Object.entries(liveAnswerCounts)) {
        const index = Number(indexStr);
        if (!isNaN(index) && index >= 0) {
          result[index] = count;
        }
      }
      return result;
    }

    // Fall back to static answer counts (from computeQuestionResults)
    return staticAnswerCounts;
  }, [leaderboard?.liveAnswerCounts, leaderboard?.answerCounts]);

  return {
    topPlayers: leaderboard?.topPlayers || [],
    totalPlayers: leaderboard?.totalPlayers || 0,
    totalAnswered: leaderboard?.totalAnswered || 0,
    answerCounts,
    loading,
  };
}
