'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/app/header';
import { Vote, Users, Play, Copy, XCircle, QrCode } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Game, Player, PollActivity } from '@/lib/types';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import { gameConverter, playerConverter, pollActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    () => collection(firestore, 'games', gameId, 'players').withConverter(playerConverter) as Query<Player>,
    [firestore, gameId]
  );
  const { data: players } = useCollection<Player>(playersQuery);

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

  const copyPinToClipboard = () => {
    if (game?.gamePin) {
      navigator.clipboard.writeText(game.gamePin);
      toast({
        title: 'Copied!',
        description: 'Game PIN copied to clipboard.',
      });
    }
  };

  const handleStartPoll = async () => {
    if (!game) return;

    try {
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
      toast({
        title: 'Session Cancelled',
        description: 'The poll session has been cancelled.',
      });
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
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
          <Button onClick={() => router.push('/host')}>Return to Dashboard</Button>
        </main>
      </div>
    );
  }

  const playerCount = players?.length || 0;
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join` : '';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-4xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Vote className="h-10 w-10 text-teal-500" />
            <h1 className="text-4xl font-bold">{poll?.title || 'Poll'}</h1>
          </div>
          <p className="text-muted-foreground">Waiting for participants to join...</p>
        </div>

        {/* Game PIN Card */}
        <Card className="shadow-2xl rounded-3xl border-2 border-teal-500/20 mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Join at</p>
              <p className="text-xl font-medium text-primary mb-4">{joinUrl}</p>
              <p className="text-sm text-muted-foreground mb-2">Game PIN</p>
              <div className="flex items-center justify-center gap-4">
                <div
                  className="text-6xl md:text-7xl font-mono font-bold tracking-[0.3em] cursor-pointer hover:text-primary transition-colors"
                  onClick={copyPinToClipboard}
                >
                  {game.gamePin}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="icon" onClick={copyPinToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Scan to Join</DialogTitle>
                      </DialogHeader>
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <QRCodeSVG value={`${joinUrl}?pin=${game.gamePin}`} size={256} level="M" />
                      </div>
                      <p className="text-center text-muted-foreground">
                        Scan this code or go to <span className="font-medium">{joinUrl}</span>
                      </p>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Card */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Participants
              </CardTitle>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {playerCount}
              </Badge>
            </div>
            <CardDescription>
              {poll?.config.allowAnonymous
                ? 'Anonymous responses are enabled'
                : 'Participants must enter their name to join'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {playerCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No participants yet</p>
                <p className="text-sm">Share the game PIN to get started</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players?.map(player => (
                  <Badge key={player.id} variant="outline" className="text-sm py-1 px-3">
                    {player.name || 'Anonymous'}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Poll Info */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Badge variant="outline" className="text-sm py-2 px-4">
                {poll?.questions.length || 0} Question{(poll?.questions.length || 0) !== 1 ? 's' : ''}
              </Badge>
              <Badge variant={poll?.config.defaultShowLiveResults ? "default" : "secondary"} className="text-sm py-2 px-4">
                {poll?.config.defaultShowLiveResults ? 'Live Results' : 'Results Hidden'}
              </Badge>
              <Badge variant={poll?.config.allowAnonymous ? "default" : "secondary"} className="text-sm py-2 px-4">
                {poll?.config.allowAnonymous ? 'Anonymous Allowed' : 'Named Only'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleStartPoll}
            disabled={playerCount === 0}
            className="flex-1 py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 rounded-xl"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Poll {playerCount > 0 && `(${playerCount} participant${playerCount !== 1 ? 's' : ''})`}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="sm:w-auto py-6 text-lg rounded-xl">
                <XCircle className="mr-2 h-5 w-5" /> Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Cancel this session?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This will remove all participants and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Yes, Cancel Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
