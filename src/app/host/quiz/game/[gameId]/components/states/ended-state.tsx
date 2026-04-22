'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, BarChart3 } from 'lucide-react';
import { FinalLeaderboardView } from '../visualizations/final-leaderboard-view';
import { DeleteGameButton } from '../controls/delete-game-button';
import type { DocumentReference } from 'firebase/firestore';
import type { Game, LeaderboardEntry } from '@/lib/types';

interface EndedStateProps {
  gameId: string;
  gameRef: DocumentReference<Game> | null;
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
}

export function EndedState({ gameId, gameRef, topPlayers, totalPlayers }: EndedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-4">Quiz Over!</h1>
      <p className="text-muted-foreground mb-8">Here are the final results.</p>
      <FinalLeaderboardView topPlayers={topPlayers} totalPlayers={totalPlayers} />
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button asChild className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300">
          <Link href={`/host/quiz/analytics/${gameId}`}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/host">
            <Home className="mr-2 h-4 w-4" />
            Exit to Dashboard
          </Link>
        </Button>
        <DeleteGameButton gameRef={gameRef} />
      </div>
    </div>
  );
}
