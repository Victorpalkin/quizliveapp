'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  streak: number;
  rank: number;
}

interface LeaderboardData {
  topPlayers: LeaderboardEntry[];
  lastUpdated: Date | null;
}

/** Hook to subscribe to real-time leaderboard data */
export function useLeaderboard(gameId: string | null) {
  const firestore = useFirestore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>({
    topPlayers: [],
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId) {
      setLeaderboard({ topPlayers: [], lastUpdated: null });
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setLeaderboard({
          topPlayers: (data.topPlayers || []).map((p: Record<string, unknown>, i: number) => ({
            playerId: p.playerId as string,
            playerName: p.playerName as string,
            score: (p.score as number) ?? 0,
            streak: (p.streak as number) ?? 0,
            rank: i + 1,
          })),
          lastUpdated: data.lastUpdated?.toDate() || null,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  /** Get a specific player's rank and score */
  const getPlayerRank = (playerId: string) => {
    const entry = leaderboard.topPlayers.find((p) => p.playerId === playerId);
    return entry || null;
  };

  return { leaderboard, loading, getPlayerRank };
}
