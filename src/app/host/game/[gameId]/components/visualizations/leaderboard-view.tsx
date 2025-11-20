import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import type { Player } from '@/lib/types';

interface LeaderboardViewProps {
  players: Player[];
  currentQuestionIndex?: number;
}

export function LeaderboardView({ players, currentQuestionIndex }: LeaderboardViewProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Get points gained on the last question for each player
  const getLastQuestionPoints = (player: Player): number => {
    if (!player.answers || player.answers.length === 0 || currentQuestionIndex === undefined) {
      return 0;
    }

    // Find the answer for the current question index (since we show leaderboard after question)
    const lastAnswer = player.answers.find(a => a.questionIndex === currentQuestionIndex);
    return lastAnswer?.points || 0;
  };

  return (
    <Card className="w-full max-w-md bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy /> Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const lastPoints = getLastQuestionPoints(player);

            return (
              <li key={player.id} className="flex items-center justify-between p-3 rounded-md bg-background/50">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg w-6">{index + 1}</span>
                  <span className="text-lg">{player.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {lastPoints > 0 && (
                    <span className="text-sm font-semibold text-green-500">
                      +{lastPoints}
                    </span>
                  )}
                  <span className="font-bold text-lg text-primary">{player.score}</span>
                </div>
              </li>
            );
          })}
          {players.length === 0 && <p className="text-muted-foreground text-center p-4">No players have joined yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
