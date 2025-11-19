import { PartyPopper, Frown, Clock } from 'lucide-react';
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

  let bgColor = 'bg-red-500';
  let icon = <Frown className="w-24 h-24 mb-4" />;
  let message = 'Incorrect';

  if (isCorrect) {
    bgColor = 'bg-green-500';
    icon = <PartyPopper className="w-24 h-24 mb-4" />;
    message = 'Correct!';
  } else if (isPartiallyCorrect) {
    bgColor = 'bg-yellow-500';
    icon = <PartyPopper className="w-24 h-24 mb-4" />;
    message = 'Partially Correct!';
  } else if (wasTimeout) {
    bgColor = 'bg-orange-500';
    icon = <Clock className="w-24 h-24 mb-4" />;
    message = 'No Answer';
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 w-full h-full ${bgColor} text-white`}>
      {icon}
      <h1 className="text-6xl font-bold">{message}</h1>
      <p className="text-3xl mt-4">+{lastAnswer?.points || 0} points</p>
      <p className="text-2xl mt-8">Your score: {playerScore}</p>
      <LoadingSpinner
        message={isLastQuestion ? "Revealing final scores..." : "Loading next question..."}
        className="mt-12"
      />
    </div>
  );
}
