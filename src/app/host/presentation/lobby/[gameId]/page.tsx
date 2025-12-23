'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Users, Play } from 'lucide-react';
import { GameHeader } from '@/components/app/game-header';
import { TipBanner, ReadinessChecklist } from '@/components/app/host-action-hint';
import { useUser } from '@/firebase';
import {
  usePresentationGame,
  usePresentationPlayers,
  usePresentationGameControls,
  usePresentation,
} from '@/firebase/presentation';
import { Skeleton } from '@/components/ui/skeleton';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function PresentationLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const { game, loading: gameLoading } = usePresentationGame(gameId);
  const { players, loading: playersLoading } = usePresentationPlayers(gameId);
  const { startPresentation, cancelGame } = usePresentationGameControls(gameId);
  const { presentation } = usePresentation(game?.presentationId || '');

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Save host session when lobby is loaded
  useEffect(() => {
    if (game && presentation && user) {
      saveHostSession(
        gameId,
        game.gamePin,
        game.presentationId,
        presentation.title,
        user.uid,
        'presentation',
        'lobby'
      );
    }
  }, [gameId, game, presentation, user]);

  // Redirect if game already started
  useEffect(() => {
    if (game?.state === 'presenting') {
      router.push(`/host/presentation/present/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  const handleStartPresentation = async () => {
    await startPresentation();
    router.push(`/host/presentation/present/${gameId}`);
  };

  const handleCancelGame = async () => {
    clearHostSession();
    await cancelGame();
    router.push('/host');
  };

  if (userLoading || gameLoading) {
    return <FullPageLoader />;
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Game not found</h1>
        <button
          onClick={() => router.push('/host')}
          className="text-primary underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Game Header with PIN, QR, and Cancel */}
          <GameHeader
            gamePin={game.gamePin}
            playerCount={players.length}
            activityType="presentation"
            title={presentation?.title}
            onCancel={handleCancelGame}
            isLive={false}
          />

          {/* Tips and Readiness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipBanner>
              Share the PIN or scan the QR code with your audience to let them join
            </TipBanner>
            <ReadinessChecklist
              items={[
                {
                  label: 'Players joined',
                  isReady: players.length > 0,
                  detail: `${players.length} player${players.length !== 1 ? 's' : ''}`,
                },
              ]}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List */}
            <Card className="lg:col-span-2 border border-card-border shadow-sm">
              <div className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Players</CardTitle>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {playersLoading ? '...' : players.length}
                  </span>
                </div>
              </div>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : players.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for players to join...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {players.map((player) => (
                      <span
                        key={player.id}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                      >
                        {player.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Presentation Card */}
            <Card className="border-2 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">Ready to Present?</CardTitle>
                  <CardDescription>
                    {presentation?.slides.length || 0} slides in this presentation
                  </CardDescription>
                </div>
                <Button
                  onClick={handleStartPresentation}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Presentation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
