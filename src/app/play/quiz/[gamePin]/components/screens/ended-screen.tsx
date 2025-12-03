import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

interface EndedScreenProps {
  playerScore: number;
  playerRank?: number;
  totalPlayers?: number;
  onPlayAgain: () => void;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function EndedScreen({ playerScore, playerRank, totalPlayers, onPlayAgain }: EndedScreenProps) {
  // Determine display elements based on rank
  let rankEmoji = null;
  let rankMessage = 'Quiz Finished!';
  let showTrophy = true;

  if (playerRank) {
    if (playerRank === 1) {
      rankEmoji = '🥇';
      rankMessage = 'You Won!';
      showTrophy = false;
    } else if (playerRank === 2) {
      rankEmoji = '🥈';
      rankMessage = '2nd Place!';
      showTrophy = false;
    } else if (playerRank === 3) {
      rankEmoji = '🥉';
      rankMessage = '3rd Place!';
      showTrophy = false;
    } else {
      rankMessage = `You finished ${getOrdinalSuffix(playerRank)}!`;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-primary text-primary-foreground">
      {/* Icon or Emoji */}
      {showTrophy ? (
        <Trophy className="w-24 h-24 mb-4 text-yellow-400" />
      ) : (
        <div className="text-8xl mb-4">{rankEmoji}</div>
      )}

      {/* Rank Message */}
      <h1 className="text-5xl font-bold mb-4">{rankMessage}</h1>

      {/* Rank Badge (for all players with rank data) */}
      {playerRank && totalPlayers && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 mb-6">
          <span className="text-2xl font-semibold">
            {getOrdinalSuffix(playerRank)} of {totalPlayers} players
          </span>
        </div>
      )}

      {/* Final Score */}
      <p className="text-3xl mt-2">Your final score:</p>
      <p className="text-8xl font-bold my-8">{playerScore}</p>

      {/* Play Again Button */}
      <Button onClick={onPlayAgain} size="lg" variant="secondary" className="mt-12 text-xl">
        Play Again
      </Button>
    </div>
  );
}
