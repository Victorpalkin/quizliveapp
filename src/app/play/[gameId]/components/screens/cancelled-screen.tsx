import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

interface CancelledScreenProps {
  onReturnHome: () => void;
}

export function CancelledScreen({ onReturnHome }: CancelledScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full h-full bg-destructive text-destructive-foreground">
      <XCircle className="w-24 h-24 mb-4" />
      <h1 className="text-5xl font-bold">Game Canceled</h1>
      <p className="text-2xl mt-4">The host has canceled the game.</p>
      <Button onClick={onReturnHome} size="lg" variant="secondary" className="mt-12 text-xl">
        Return Home
      </Button>
    </div>
  );
}
