'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, XCircle, QrCode, Play, Cloud } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Header } from '@/components/app/header';
import { QRCodeSVG } from 'qrcode.react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, DocumentReference, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, InterestCloudActivity } from '@/lib/types';
import { gameConverter, interestCloudActivityConverter } from '@/firebase/converters';
import { clearHostSession, saveHostSession } from '@/lib/host-session';
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

export default function InterestCloudLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [joinUrl, setJoinUrl] = useState<string>('');

  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Fetch activity for session info
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(interestCloudActivityConverter) as DocumentReference<InterestCloudActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity } = useDoc(activityRef);

  // Only create players query after game is loaded
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players') : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection(playersQuery);

  // Save host session when lobby is loaded
  useEffect(() => {
    if (game && activity && user) {
      saveHostSession(gameId, game.gamePin, game.activityId || '', activity.title, user.uid);
    }
  }, [gameId, game, activity, user]);

  useEffect(() => {
    if (game?.gamePin) {
      setJoinUrl(`${window.location.origin}/play/${game.gamePin}`);
    }
  }, [game?.gamePin]);

  const handleStartCollecting = async () => {
    if (!gameRef) return;

    try {
      await updateDoc(gameRef, { state: 'collecting' });
      router.push(`/host/interest-cloud/game/${gameId}`);
    } catch (error) {
      console.error("Error starting collection: ", error);
      const permissionError = new FirestorePermissionError({
        path: gameRef.path,
        operation: 'update',
        requestResourceData: { state: 'collecting' }
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleCancelSession = () => {
    if (!gameRef) return;
    clearHostSession();
    deleteDoc(gameRef)
      .then(() => {
        router.push('/host');
      })
      .catch((error) => {
        console.error("Error cancelling session: ", error);
        const permissionError = new FirestorePermissionError({
          path: gameRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Activity Title */}
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold">{activity?.title || 'Interest Cloud'}</h1>
          </div>

          {/* Compact Join Bar */}
          <Card className="border border-card-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* PIN Section */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PIN</span>
                  {gameLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-mono font-bold tracking-widest">{game?.gamePin}</span>
                      {game?.gamePin && <CopyButton text={game.gamePin} />}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block h-8 w-px bg-border" />

                {/* QR & Link Actions */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm font-medium">Scan to join</p>
                        {joinUrl && (
                          <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG value={joinUrl} size={160} level="M" />
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List - Takes 2 columns */}
            <Card className="lg:col-span-2 border border-card-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Participants</CardTitle>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {playersLoading || gameLoading ? '...' : players?.length || 0}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : players?.length === 0 ? (
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
                        {player.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Collecting Card */}
            <Card className="border-2 border-blue-500/20 shadow-sm bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">Ready to Collect?</CardTitle>
                  <CardDescription>
                    Start collecting interests from participants
                  </CardDescription>
                </div>
                <Button
                  onClick={handleStartCollecting}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition-opacity"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Collecting
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Prompt Preview */}
          {activity && (
            <Card className="border border-card-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Participant Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg italic text-muted-foreground">"{activity.config.prompt}"</p>
              </CardContent>
            </Card>
          )}

          {/* Cancel Session - Subtle footer action */}
          <div className="pt-4 border-t border-border flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all participants and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSession}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Cancel Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
