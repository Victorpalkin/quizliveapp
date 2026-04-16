'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Home } from 'lucide-react';

interface EndedScreenProps {
  playerName: string;
  onReturnHome: () => void;
}

export function EndedScreen({ playerName, onReturnHome }: EndedScreenProps) {
  return (
    <Card className="w-full max-w-md text-center shadow-2xl">
      <CardContent className="p-8">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold mb-2">Poll Complete!</h2>
        <p className="text-muted-foreground mb-6">
          Thanks for participating, {playerName || 'Anonymous'}!
        </p>
        <Button
          onClick={onReturnHome}
          size="lg"
          className="w-full"
        >
          <Home className="mr-2 h-5 w-5" /> Join Another Game
        </Button>
      </CardContent>
    </Card>
  );
}
