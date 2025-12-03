import { Card } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types';

interface FinalLeaderboardViewProps {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
}

/**
 * Displays the top 20 players at the end of the game.
 * Uses pre-sorted data from the server-side aggregate document.
 */
export function FinalLeaderboardView({ topPlayers, totalPlayers }: FinalLeaderboardViewProps) {
  // Component for top 3 players with special styling
  const PodiumCard = ({ player, rank }: { player: LeaderboardEntry; rank: number }) => {
    const lastPoints = player.lastQuestionPoints;

    // Progressive sizing and styling based on rank
    const rankStyles = {
      1: {
        container: 'p-8 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-l-4 border-amber-500 shadow-xl',
        rank: 'text-4xl text-amber-500',
        name: 'text-3xl',
        score: 'text-6xl bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent',
        points: 'text-base',
        streak: 'w-7 h-7'
      },
      2: {
        container: 'p-6 bg-gradient-to-br from-slate-400/10 to-gray-400/5 border-l-4 border-slate-400 shadow-lg',
        rank: 'text-3xl text-slate-400',
        name: 'text-2xl',
        score: 'text-5xl bg-gradient-to-r from-slate-400 to-gray-400 bg-clip-text text-transparent',
        points: 'text-sm',
        streak: 'w-6 h-6'
      },
      3: {
        container: 'p-5 bg-gradient-to-br from-orange-600/10 to-amber-700/5 border-l-4 border-orange-600 shadow-lg',
        rank: 'text-2xl text-orange-600',
        name: 'text-xl',
        score: 'text-4xl bg-gradient-to-r from-orange-600 to-amber-700 bg-clip-text text-transparent',
        points: 'text-sm',
        streak: 'w-6 h-6'
      }
    }[rank];

    if (!rankStyles) return null;

    return (
      <Card className={`w-full mb-6 transition-all duration-300 hover:scale-[1.02] ${rankStyles.container}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className={`font-bold ${rankStyles.rank}`}>{rank}</span>
            <span className={`font-semibold ${rankStyles.name}`}>{player.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {lastPoints > 0 && (
              <span className={`font-semibold text-green-500 ${rankStyles.points}`}>
                +{lastPoints}
              </span>
            )}
            {player.currentStreak >= 2 && (
              <div className="flex items-center gap-1">
                <Flame className={`${rankStyles.streak} text-red-500`} />
                <span className={`${rankStyles.points} font-bold text-red-500`}>{player.currentStreak}</span>
              </div>
            )}
            <span className={`font-bold ${rankStyles.score}`}>{player.score}</span>
          </div>
        </div>
      </Card>
    );
  };

  // Component for remaining players with standard styling
  const StandardCard = ({ player, rank }: { player: LeaderboardEntry; rank: number }) => {
    const lastPoints = player.lastQuestionPoints;

    return (
      <Card className="w-full mb-3 p-4 bg-card border-border shadow-md transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-muted-foreground w-8">{rank}</span>
            <span className="text-lg font-medium">{player.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {lastPoints > 0 && (
              <span className="text-sm font-semibold text-green-500">
                +{lastPoints}
              </span>
            )}
            {player.currentStreak >= 2 && (
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-500">{player.currentStreak}</span>
              </div>
            )}
            <span className="font-bold text-2xl text-primary">{player.score}</span>
          </div>
        </div>
      </Card>
    );
  };

  // Data is already sorted from server
  const top3Players = topPlayers.slice(0, 3);
  const remainingPlayers = topPlayers.slice(3); // Up to 17 more (total 20)

  return (
    <div className="w-full max-w-3xl">
      {/* Total players indicator */}
      {totalPlayers > 20 && (
        <p className="text-muted-foreground text-center mb-4">
          Showing top 20 of {totalPlayers} players
        </p>
      )}

      {/* Top 3 Players */}
      <div className="mb-8">
        {top3Players.map((player, index) => (
          <PodiumCard key={player.id} player={player} rank={index + 1} />
        ))}
      </div>

      {/* Remaining Players (4-20) */}
      {remainingPlayers.length > 0 && (
        <div>
          {remainingPlayers.map((player, index) => (
            <StandardCard key={player.id} player={player} rank={index + 4} />
          ))}
        </div>
      )}

      {topPlayers.length === 0 && (
        <p className="text-muted-foreground text-center p-4">No players participated in this game.</p>
      )}
    </div>
  );
}
