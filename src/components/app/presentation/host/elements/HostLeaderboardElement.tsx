'use client';

import { motion } from 'motion/react';
import { useLeaderboard } from '@/firebase/presentation';
import { Trophy } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostLeaderboardElementProps {
  element: SlideElement;
  gameId: string;
}

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const PODIUM_LABELS = ['1st', '2nd', '3rd'];

export function HostLeaderboardElement({ element, gameId }: HostLeaderboardElementProps) {
  const config = element.leaderboardConfig;
  const { leaderboard } = useLeaderboard(gameId);

  const maxDisplay = config?.maxDisplay || 10;
  const showScores = config?.showScores ?? true;
  const displayed = leaderboard.topPlayers.slice(0, maxDisplay);

  return (
    <div className="w-full h-full flex flex-col p-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-4 flex-shrink-0 flex items-center justify-center gap-2"
      >
        <Trophy className="h-6 w-6 text-yellow-500" />
        Leaderboard
      </motion.h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {displayed.length === 0 && (
          <p className="text-center text-muted-foreground">No scores yet</p>
        )}
        {displayed.map((player, i) => (
          <motion.div
            key={player.playerId}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              layout: { type: 'spring', stiffness: 300, damping: 30 },
              delay: i * 0.05,
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
            style={{
              backgroundColor: i < 3 ? `${PODIUM_COLORS[i]}15` : undefined,
              boxShadow: i < 3 ? `0 0 20px ${PODIUM_COLORS[i]}15` : undefined,
            }}
          >
            {/* Position badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                backgroundColor: i < 3 ? PODIUM_COLORS[i] : 'hsl(var(--muted))',
                color: i < 3 ? '#000' : 'hsl(var(--muted-foreground))',
              }}
            >
              {i < 3 ? PODIUM_LABELS[i] : i + 1}
            </div>

            {/* Avatar circle */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${PODIUM_COLORS[i % 3]}80, ${PODIUM_COLORS[(i + 1) % 3]}80)`,
              }}
            >
              {player.playerName.charAt(0).toUpperCase()}
            </div>

            <span className="flex-1 text-lg font-medium truncate">{player.playerName}</span>
            {showScores && (
              <motion.span
                key={player.score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-lg font-mono font-bold"
              >
                {player.score.toLocaleString()}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
