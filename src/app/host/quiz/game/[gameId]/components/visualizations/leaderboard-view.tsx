import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardViewProps {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
}

/**
 * Displays the top 10 players during the game.
 * Uses pre-sorted data from the server-side aggregate document.
 */
export function LeaderboardView({ topPlayers, totalPlayers }: LeaderboardViewProps) {
  // Show only top 10 during game (we have top 20 available for final screen)
  const displayPlayers = topPlayers.slice(0, 10);

  return (
    <Card className="w-full max-w-md bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy /> Top 10 {totalPlayers > 10 && `of ${totalPlayers}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {displayPlayers.map((player, index) => (
            <li key={player.id} className="flex items-center justify-between p-3 rounded-md bg-background/50">
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg w-6">{index + 1}</span>
                <span className="text-lg">{player.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {player.lastQuestionPoints > 0 && (
                  <span className="text-sm font-semibold text-green-500">
                    +{player.lastQuestionPoints}
                  </span>
                )}
                {player.currentStreak >= 2 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-bold text-red-500">{player.currentStreak}</span>
                  </div>
                )}
                <span className="font-bold text-lg text-primary">{player.score}</span>
              </div>
            </li>
          ))}
          {topPlayers.length === 0 && (
            <p className="text-muted-foreground text-center p-4">No players have joined yet.</p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
