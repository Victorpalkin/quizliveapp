'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SlidePlayerProps } from '../types';
import { usePresentationLeaderboard } from '@/firebase/presentation/use-presentation-leaderboard';

/**
 * LeaderboardPlayer shows the player their current rank.
 * This is a passive slide - no interaction required.
 */
export function LeaderboardPlayer({ slide, game, playerId, playerName }: SlidePlayerProps) {
  const title = slide.leaderboardTitle || 'Leaderboard';
  const mode = slide.leaderboardMode || 'standard';

  const { topPlayers, totalPlayers, playerRanks, loading } = usePresentationLeaderboard(game.id);

  // Get player's rank info
  const playerRankInfo = playerRanks[playerId];
  const rank = playerRankInfo?.rank;

  // Find player in top players list for score
  const playerEntry = topPlayers.find(p => p.id === playerId);
  const score = playerEntry?.score || 0;

  // Get rank display
  const getRankEmoji = (r: number) => {
    switch (r) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  if (loading) {
    return (
      <motion.div
        className="w-full h-full flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-muted-foreground">Loading...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Title */}
      <motion.h2
        className="text-2xl font-bold mb-6 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {mode === 'podium' ? 'Final Results' : title}
      </motion.h2>

      {/* Player Rank Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="w-full max-w-sm bg-card/95 backdrop-blur">
          <CardContent className="p-6 text-center">
            {/* Rank Display */}
            {rank !== undefined ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {getRankEmoji(rank) ? (
                    <span className="text-5xl">{getRankEmoji(rank)}</span>
                  ) : (
                    <Trophy className="h-8 w-8 text-primary" />
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-2">{playerName}</p>

                <div className="text-6xl font-bold text-primary mb-2">
                  #{rank}
                </div>

                <p className="text-muted-foreground">
                  of {totalPlayers} players
                </p>

                {/* Score */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-3xl font-bold">{score}</p>
                </div>
              </>
            ) : (
              <>
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Waiting for results...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Encouragement message based on rank */}
      {rank !== undefined && (
        <motion.p
          className="mt-4 text-sm text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {rank === 1 && "You're in the lead! Keep it up!"}
          {rank === 2 && "So close to first place!"}
          {rank === 3 && "On the podium!"}
          {rank > 3 && rank <= 10 && "Great job! You're in the top 10!"}
          {rank > 10 && "Keep going!"}
        </motion.p>
      )}
    </motion.div>
  );
}
