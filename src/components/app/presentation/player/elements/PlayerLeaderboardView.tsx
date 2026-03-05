'use client';

import { motion } from 'motion/react';
import { Trophy, Award, Flame } from 'lucide-react';
import { useLeaderboard } from '@/firebase/presentation';

interface PlayerLeaderboardViewProps {
  gameId: string;
  playerId: string;
  playerScore: number;
  playerStreak: number;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function PlayerLeaderboardView({
  gameId,
  playerId,
  playerScore,
  playerStreak,
}: PlayerLeaderboardViewProps) {
  const { getPlayerRank, loading } = useLeaderboard(gameId);
  const rankEntry = getPlayerRank(playerId);
  const rank = rankEntry?.rank ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Trophy */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/20 flex items-center justify-center">
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>
      </motion.div>

      {/* Rank */}
      {rank !== null ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-4"
        >
          <div className="bg-gradient-to-r from-primary to-accent px-6 py-3 rounded-2xl inline-block">
            <span className="text-3xl font-bold text-white">
              {getOrdinalSuffix(rank)}
            </span>
          </div>
        </motion.div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mb-4"
        >
          Not ranked yet
        </motion.p>
      )}

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl px-6 py-4 mb-4"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Award className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Score</span>
        </div>
        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {playerScore.toLocaleString()}
        </p>
      </motion.div>

      {/* Streak */}
      {playerStreak >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10"
        >
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-orange-500">{playerStreak} streak</span>
        </motion.div>
      )}
    </div>
  );
}
