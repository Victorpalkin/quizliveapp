'use client';

import { useLeaderboard } from '@/firebase/presentation';
import { Trophy } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostLeaderboardElementProps {
  element: SlideElement;
  gameId: string;
}

export function HostLeaderboardElement({ element, gameId }: HostLeaderboardElementProps) {
  const config = element.leaderboardConfig;
  const { leaderboard } = useLeaderboard(gameId);

  const maxDisplay = config?.maxDisplay || 10;
  const showScores = config?.showScores ?? true;
  const displayed = leaderboard.topPlayers.slice(0, maxDisplay);

  const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-2xl font-bold text-center mb-4 flex-shrink-0 flex items-center justify-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        Leaderboard
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {displayed.length === 0 && (
          <p className="text-center text-muted-foreground">No scores yet</p>
        )}
        {displayed.map((player, i) => (
          <div
            key={player.playerId}
            className="flex items-center gap-3 p-2 rounded-lg transition-all"
            style={{
              backgroundColor: i < 3 ? `${PODIUM_COLORS[i]}15` : undefined,
            }}
          >
            <span
              className="text-lg font-bold w-8 text-center"
              style={{ color: i < 3 ? PODIUM_COLORS[i] : undefined }}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-lg font-medium truncate">{player.playerName}</span>
            {showScores && (
              <span className="text-lg font-mono font-bold">{player.score.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
