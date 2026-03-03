'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Play, Loader2 } from 'lucide-react';
import { GameHeader } from '@/components/app/game-header';
import { ReadinessChecklist } from '@/components/app/host-action-hint';
import { useUser } from '@/firebase';
import { usePresentationGame, usePresentationControls } from '@/firebase/presentation/use-presentation-game';
import { saveHostSession } from '@/lib/host-session';

export default function PresentationLobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { game, players, loading: gameLoading } = usePresentationGame(gameId);
  const controls = usePresentationControls(gameId);

  // Save host session
  useEffect(() => {
    if (game && user) {
      saveHostSession(
        gameId,
        game.gamePin,
        game.presentationId,
        'Presentation',
        user.uid,
        'presentation',
        'lobby',
        `/host/presentation/lobby/${gameId}`
      );
    }
  }, [gameId, game, user]);

  // Redirect when game starts
  useEffect(() => {
    if (game?.state === 'active') {
      router.push(`/host/presentation/present/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  if (authLoading || gameLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Game not found</p>
      </div>
    );
  }

  const handleStart = async () => {
    await controls.startPresentation();
    router.push(`/host/presentation/present/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <GameHeader
        gamePin={game.gamePin}
        playerCount={players.length}
        activityType="presentation"
      />

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Player list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for players to join...
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium animate-in fade-in slide-in-from-bottom-2"
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Readiness checklist */}
        <ReadinessChecklist
          items={[
            {
              label: 'At least 1 player joined',
              isReady: players.length > 0,
            },
          ]}
        />

        {/* Start button */}
        <Button
          onClick={handleStart}
          disabled={players.length === 0}
          size="lg"
          variant="gradient"
          className="w-full h-14 text-lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Start Presentation
        </Button>
      </div>
    </div>
  );
}
