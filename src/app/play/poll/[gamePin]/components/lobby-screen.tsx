'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Vote, Clock } from 'lucide-react';

interface LobbyScreenProps {
  playerName: string;
}

export function LobbyScreen({ playerName }: LobbyScreenProps) {
  return (
    <Card className="w-full max-w-md text-center shadow-2xl">
      <CardContent className="p-8">
        <Vote className="h-16 w-16 mx-auto mb-4 text-teal-500" />
        <h2 className="text-2xl font-bold mb-2">You&apos;re In!</h2>
        <p className="text-muted-foreground mb-4">
          Welcome, {playerName || 'Anonymous'}!
        </p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5 animate-pulse" />
          <span>Waiting for the poll to start...</span>
        </div>
      </CardContent>
    </Card>
  );
}
