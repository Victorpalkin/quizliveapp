import { Timer } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface WaitingScreenProps {
  isLastQuestion: boolean;
}

export function WaitingScreen({ isLastQuestion }: WaitingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-background">
      <Timer className="w-24 h-24 mb-4 text-primary animate-pulse" />
      <h1 className="text-4xl font-bold">Answer Locked In!</h1>
      <p className="text-muted-foreground mt-2 text-xl">Waiting for question to finish...</p>
      <LoadingSpinner
        message={isLastQuestion ? "Waiting for final results..." : "Waiting for other players..."}
        className="mt-12"
      />
    </div>
  );
}
