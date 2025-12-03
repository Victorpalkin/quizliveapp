import { PartyPopper, Frown, Clock, Award, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ResultScreenProps {
  lastAnswer: {
    selected: number;
    correct: number[];
    points: number;
    wasTimeout: boolean;
    isPartiallyCorrect?: boolean;
  } | null;
  playerScore: number;
  isLastQuestion: boolean;
  currentStreak?: number;
  playerRank?: number;
  totalPlayers?: number;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ResultScreen({ lastAnswer, playerScore, isLastQuestion, currentStreak, playerRank, totalPlayers }: ResultScreenProps) {
  const isCorrect = lastAnswer ? lastAnswer.correct.includes(lastAnswer.selected) : false;
  const wasTimeout = lastAnswer?.wasTimeout || false;
  const isPartiallyCorrect = lastAnswer?.isPartiallyCorrect || false;

  let borderColor = 'border-l-destructive';
  let iconBgColor = 'bg-destructive/10';
  let iconColor = 'text-destructive';
  let icon = <Frown className="w-16 h-16" />;
  let message = 'Incorrect';

  if (isCorrect) {
    borderColor = 'border-l-green-500';
    iconBgColor = 'bg-green-500/10';
    iconColor = 'text-green-500';
    icon = <PartyPopper className="w-16 h-16" />;
    message = 'Correct!';
  } else if (isPartiallyCorrect) {
    borderColor = 'border-l-yellow-500';
    iconBgColor = 'bg-yellow-500/10';
    iconColor = 'text-yellow-500';
    icon = <PartyPopper className="w-16 h-16" />;
    message = 'Partially Correct!';
  } else if (wasTimeout) {
    borderColor = 'border-l-orange-500';
    iconBgColor = 'bg-orange-500/10';
    iconColor = 'text-orange-500';
    icon = <Clock className="w-16 h-16" />;
    message = 'No Answer';
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
      <Card className={`max-w-2xl w-full border-l-8 ${borderColor} shadow-xl`}>
        <div className="p-12 space-y-8">
          {/* Icon Badge */}
          <div className="flex justify-center">
            <div className={`rounded-2xl ${iconBgColor} p-6`}>
              <div className={iconColor}>
                {icon}
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-5xl font-semibold">{message}</h1>

          {/* Points Earned - with gradient */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-card-border">
            <p className="text-sm text-muted-foreground mb-2">Points Earned</p>
            <p className="text-4xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              +{lastAnswer?.points || 0}
            </p>
          </div>

          {/* Streak Display - only show when player has 2+ correct answers in a row */}
          {currentStreak !== undefined && currentStreak >= 2 && isCorrect && (
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-6 border border-red-500/20">
              <div className="flex items-center justify-center gap-3">
                <Flame className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                    On Fire! {currentStreak} in a row
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Total Score */}
          <div className="flex items-center justify-center gap-3 text-2xl">
            <Award className="h-6 w-6 text-muted-foreground" />
            <span className="text-muted-foreground">Total Score:</span>
            <span className="font-semibold">{playerScore}</span>
          </div>

          {/* Player Rank Badge */}
          {playerRank && totalPlayers && (
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-card-border">
              <p className="text-sm text-muted-foreground mb-2">Current Rank</p>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-gradient-to-r from-primary to-accent px-4 py-2 rounded-xl">
                  <span className="text-lg font-semibold text-white">
                    #{getOrdinalSuffix(playerRank)}
                  </span>
                </div>
                <span className="text-lg text-muted-foreground">of {totalPlayers} players</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading indicator */}
      <div className="mt-12">
        <LoadingSpinner
          message={isLastQuestion ? "Revealing final scores..." : "Loading next question..."}
        />
      </div>
    </div>
  );
}
