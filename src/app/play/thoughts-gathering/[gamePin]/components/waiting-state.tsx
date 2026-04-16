'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PauseCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { Game, ThoughtSubmission } from '@/lib/types';

interface WaitingStateProps {
  game: Game | null;
  playerSubmissions: ThoughtSubmission[] | null;
}

export function WaitingState({ game, playerSubmissions }: WaitingStateProps) {
  const isProcessing = game?.state === 'processing';

  return (
    <Card className="w-full max-w-md text-center shadow-2xl">
      <CardContent className="p-8">
        {isProcessing ? (
          <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
        ) : (
          <PauseCircle className="h-16 w-16 mx-auto mb-4 text-orange-500 animate-pulse" />
        )}
        <h2 className="text-2xl font-bold mb-2">
          {isProcessing ? 'Analyzing...' : 'Submissions Paused'}
        </h2>
        <p className="text-muted-foreground">
          {isProcessing
            ? 'AI is analyzing all submissions. This usually takes 15\u201330 seconds.'
            : 'Hang tight \u2014 the host will resume shortly.'}
        </p>

        {/* Liveness indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Connected</span>
        </div>

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
