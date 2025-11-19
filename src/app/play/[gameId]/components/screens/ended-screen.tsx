import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

interface EndedScreenProps {
  playerScore: number;
  onPlayAgain: () => void;
}

export function EndedScreen({ playerScore, onPlayAgain }: EndedScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-primary text-primary-foreground">
      <Trophy className="w-24 h-24 mb-4 text-yellow-400" />
      <h1 className="text-5xl font-bold">Quiz Finished!</h1>
      <p className="text-3xl mt-4">Your final score is:</p>
      <p className="text-8xl font-bold my-8">{playerScore}</p>
      <Button onClick={onPlayAgain} size="lg" variant="secondary" className="mt-12 text-xl">
        Play Again
      </Button>
    </div>
  );
}
