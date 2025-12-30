'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Play } from 'lucide-react';
import { GameHeader } from '@/components/app/game-header';
import { TipBanner, ReadinessChecklist } from '@/components/app/host-action-hint';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Game, Player, PollActivity } from '@/lib/types';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { gameConverter, playerConverter, pollActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Skeleton } from '@/components/ui/skeleton';

export default function PollLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const gameId = params.gameId as string;

  // Game data
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Activity data
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: poll } = useDoc(activityRef);

  // Players
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) as Query<Player> : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Save host session when lobby is loaded
  useEffect(() => {
    if (game && poll && user) {
      saveHostSession(gameId, game.gamePin, game.activityId || '', poll.title, user.uid, 'poll', 'lobby', `/host/poll/lobby/${gameId}`);
    }
  }, [gameId, game, poll, user]);

  // Redirect if game state changes
  useEffect(() => {
    if (game?.state === 'question' || game?.state === 'results') {
      router.push(`/host/poll/game/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  const handleStartPoll = async () => {
    if (!game || !poll) return;

    try {
      // Initialize leaderboard aggregate with player count before starting
      const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
      await setDoc(leaderboardRef, {
        topPlayers: [],
        totalPlayers: players?.length || 0,
        totalAnswered: 0,
        answerCounts: [],
        lastUpdated: serverTimestamp(),
      });

      await updateDoc(doc(firestore, 'games', gameId), {
        state: 'question',
        currentQuestionIndex: 0,
      });
      router.push(`/host/poll/game/${gameId}`);
    } catch (error) {
      console.error('Error starting poll:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start the poll. Please try again.",
      });
    }
  };

  const handleCancelGame = async () => {
    try {
      clearHostSession();
      await deleteDoc(doc(firestore, 'games', gameId));
      router.push('/host');
    } catch (error) {
      console.error('Error cancelling game:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not cancel the session. Please try again.",
      });
    }
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

  const playerCount = players?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Game Header with PIN, QR, and Cancel */}
          <GameHeader
            gamePin={game.gamePin}
            playerCount={playerCount}
            activityType="poll"
            title={poll?.title}
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
                  label: 'Participants joined',
                  isReady: playerCount > 0,
                  detail: `${playerCount} participant${playerCount !== 1 ? 's' : ''}`,
                },
              ]}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List - Takes 2 columns */}
            <Card className="lg:col-span-2 border border-card-border shadow-sm">
              <div className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Participants</CardTitle>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {playersLoading || gameLoading ? '...' : playerCount}
                  </span>
                </div>
                {poll?.config.allowAnonymous && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Anonymous responses are enabled
                  </p>
                )}
              </div>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : playerCount === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for participants to join...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {players?.map(player => (
                      <span
                        key={player.id}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                      >
                        {player.name || 'Anonymous'}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Poll Card */}
            <Card className="border-2 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">Ready to Start?</CardTitle>
                  <CardDescription>
                    {poll?.questions.length || 0} question{(poll?.questions.length || 0) !== 1 ? 's' : ''} in this poll
                  </CardDescription>
                </div>

                {/* Poll Settings Badges */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant={poll?.config.defaultShowLiveResults ? "default" : "secondary"} className="text-xs">
                    {poll?.config.defaultShowLiveResults ? 'Live Results' : 'Results Hidden'}
                  </Badge>
                  <Badge variant={poll?.config.allowAnonymous ? "default" : "secondary"} className="text-xs">
                    {poll?.config.allowAnonymous ? 'Anonymous' : 'Named Only'}
                  </Badge>
                </div>

                <Button
                  onClick={handleStartPoll}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Poll
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
