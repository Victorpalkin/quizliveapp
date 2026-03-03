'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import type { PresentationAnalytics } from '../hooks/use-analytics';

interface LeaderboardTabProps {
  analytics: PresentationAnalytics;
}

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function LeaderboardTab({ analytics }: LeaderboardTabProps) {
  const { playerEngagement } = analytics;

  // Sort by score
  const sorted = [...playerEngagement].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No leaderboard data available.</p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Final Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map((player, i) => (
            <div
              key={player.playerId}
              className="flex items-center gap-3 p-2 rounded-lg"
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
              <span className="flex-1 font-medium">{player.playerName}</span>
              <span className="font-mono font-bold">{player.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
