'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardViewProps {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  /** Maximum number of players to display (default: 10) */
  maxDisplay?: number;
  /** Title to show in header (default: "Top {maxDisplay}") */
  title?: string;
  /** Whether to show the card wrapper (default: true) */
  showCard?: boolean;
}

/**
 * Displays the top players during a game or presentation.
 * Uses pre-sorted data from the server-side aggregate document.
 *
 * Reused by:
 * - Standalone quiz game host view
 * - Presentation leaderboard slide
 */
export function LeaderboardView({
  topPlayers,
  totalPlayers,
  maxDisplay = 10,
  title,
  showCard = true,
}: LeaderboardViewProps) {
  const displayPlayers = topPlayers.slice(0, maxDisplay);
  const displayTitle = title || `Top ${maxDisplay}`;

  const content = (
    <>
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
    </>
  );

  if (!showCard) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <Card className="w-full max-w-md bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy /> {displayTitle} {totalPlayers > maxDisplay && `of ${totalPlayers}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
