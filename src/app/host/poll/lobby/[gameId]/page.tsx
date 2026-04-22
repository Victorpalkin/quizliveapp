'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query, setDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Game, Player, PollActivity } from '@/lib/types';
import { clearHostSession } from '@/lib/host-session';
import { useHostSession } from '../../../hooks/use-host-session';
import { gameConverter, playerConverter, pollActivityConverter } from '@/firebase/converters';
import { LobbyLayout } from '../../../components/lobby-layout';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function PollLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const gameId = params.gameId as string;

  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: poll } = useDoc(activityRef);

  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) as Query<Player> : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection<Player>(playersQuery);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useHostSession({
    gameId,
    game,
    contentId: game?.activityId || '',
    contentTitle: poll?.title || '',
    userId: user?.uid,
    activityType: 'poll',
    returnPath: `/host/poll/lobby/${gameId}`,
  });

  useEffect(() => {
    if (game?.state === 'question' || game?.state === 'results') {
      router.push(`/host/poll/game/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  const handleStartPoll = async () => {
    if (!game || !poll) return;

    try {
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
        <button onClick={() => router.push('/host')} className="text-primary underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const playerCount = players?.length || 0;

  return (
    <LobbyLayout
      gamePin={game.gamePin}
      playerCount={playerCount}
      activityType="poll"
      title={poll?.title}
      onCancel={handleCancelGame}
      tipText="Share the PIN or scan the QR code with your audience to let them join"
      readinessItems={[
        {
          label: 'Participants joined',
          isReady: playerCount > 0,
          detail: `${playerCount} participant${playerCount !== 1 ? 's' : ''}`,
        },
      ]}
      players={players}
      playersLoading={playersLoading}
      gameLoading={gameLoading}
      startLabel="Start Poll"
      startDescription={`${poll?.questions.length || 0} question${(poll?.questions.length || 0) !== 1 ? 's' : ''} in this poll`}
      startConfirmTitle="Start the poll?"
      startConfirmDescription={`Start the poll with ${playerCount} participant${playerCount !== 1 ? 's' : ''}?`}
      onStart={handleStartPoll}
      startCardExtra={
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant={poll?.config.defaultShowLiveResults ? "default" : "secondary"} className="text-xs">
            {poll?.config.defaultShowLiveResults ? 'Live Results' : 'Results Hidden'}
          </Badge>
          <Badge variant={poll?.config.allowAnonymous ? "default" : "secondary"} className="text-xs">
            {poll?.config.allowAnonymous ? 'Anonymous' : 'Named Only'}
          </Badge>
        </div>
      }
    />
  );
}
