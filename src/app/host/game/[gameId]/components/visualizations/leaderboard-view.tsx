import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import type { Player } from '@/lib/types';

interface LeaderboardViewProps {
  players: Player[];
}

export function LeaderboardView({ players }: LeaderboardViewProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="w-full max-w-md bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy /> Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <li key={player.id} className="flex items-center justify-between p-3 rounded-md bg-background/50">
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg w-6">{index + 1}</span>
                <span className="text-lg">{player.name}</span>
              </div>
              <span className="font-bold text-lg text-primary">{player.score}</span>
            </li>
          ))}
          {players.length === 0 && <p className="text-muted-foreground text-center p-4">No players have joined yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
