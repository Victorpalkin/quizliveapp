'use client';

import { motion } from 'motion/react';
import { SlideHostProps } from '../types';
import { LeaderboardView } from '@/components/app/leaderboard-view';
import { FinalLeaderboardView } from '@/components/app/final-leaderboard-view';
import { usePresentationLeaderboard } from '@/firebase/presentation/use-presentation-leaderboard';

/**
 * LeaderboardHost displays the current leaderboard during a presentation.
 * Supports two modes:
 * - 'standard': Simple top-N list (default)
 * - 'podium': Final leaderboard with podium-style top 3
 */
export function LeaderboardHost({ slide, game }: SlideHostProps) {
  const mode = slide.leaderboardMode || 'standard';
  const maxDisplay = slide.leaderboardMaxDisplay || (mode === 'podium' ? 20 : 10);
  const title = slide.leaderboardTitle;

  const { topPlayers, totalPlayers, loading } = usePresentationLeaderboard(game.id);

  if (loading) {
    return (
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-muted-foreground">Loading leaderboard...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Optional custom title for podium mode (standard mode has built-in title) */}
      {mode === 'podium' && title && (
        <motion.h1
          className="text-4xl font-bold mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h1>
      )}

      {mode === 'podium' ? (
        <FinalLeaderboardView
          topPlayers={topPlayers}
          totalPlayers={totalPlayers}
          maxDisplay={maxDisplay}
        />
      ) : (
        <LeaderboardView
          topPlayers={topPlayers}
          totalPlayers={totalPlayers}
          maxDisplay={maxDisplay}
          title={title}
        />
      )}
    </motion.div>
  );
}
