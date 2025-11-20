import { PartyPopper, Frown, Clock, Award } from 'lucide-react';
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
}

export function ResultScreen({ lastAnswer, playerScore, isLastQuestion }: ResultScreenProps) {
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

          {/* Total Score */}
          <div className="flex items-center justify-center gap-3 text-2xl">
            <Award className="h-6 w-6 text-muted-foreground" />
            <span className="text-muted-foreground">Total Score:</span>
            <span className="font-semibold">{playerScore}</span>
          </div>
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
