'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PauseCircle, CheckCircle } from 'lucide-react';
import type { Game, ThoughtSubmission } from '@/lib/types';

interface WaitingStateProps {
  game: Game | null;
  playerSubmissions: ThoughtSubmission[] | null;
}

export function WaitingState({ game, playerSubmissions }: WaitingStateProps) {
  return (
    <Card className="w-full max-w-md text-center shadow-2xl">
      <CardContent className="p-8">
        <PauseCircle className="h-16 w-16 mx-auto mb-4 text-orange-500" />
        <h2 className="text-2xl font-bold mb-2">
          {game?.state === 'processing' ? 'Processing...' : 'Submissions Paused'}
        </h2>
        <p className="text-muted-foreground">
          {game?.state === 'processing'
            ? 'AI is analyzing all submissions'
            : 'The host will resume submissions soon'}
        </p>
        {playerSubmissions && playerSubmissions.length > 0 && (
          <div className="mt-6 text-left">
            <p className="text-sm font-medium mb-2">Your submissions:</p>
            <div className="space-y-2">
              {playerSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{sub.rawText}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
