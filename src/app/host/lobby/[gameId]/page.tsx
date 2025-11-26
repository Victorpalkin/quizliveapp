
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, Check, XCircle, QrCode } from 'lucide-react';
import { Header } from '@/components/app/header';
import { QRCodeSVG } from 'qrcode.react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, DocumentReference, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game } from '@/lib/types';
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
} from "@/components/ui/alert-dialog"


function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="icon" onClick={handleCopy} className="rounded-lg hover:scale-[1.02] transition-all duration-300">
      {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
    </Button>
  );
}

export default function HostLobbyPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const [joinUrl, setJoinUrl] = useState<string>('');

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId) as DocumentReference<Game>, [firestore, gameId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Only create players query after game is loaded to prevent race condition
  const playersQuery = useMemoFirebase(() => game ? collection(firestore, 'games', gameId, 'players') : null, [firestore, gameId, game]);
  const { data: players, loading: playersLoading } = useCollection(playersQuery);

  useEffect(() => {
    if (game?.gamePin) {
      setJoinUrl(`${window.location.origin}/play/${game.gamePin}`);
    }
  }, [game?.gamePin]);
  
  const handleStartGame = async () => {
    if (!gameRef) return;

    try {
      // Initialize leaderboard aggregate with player count before starting game
      // This ensures "X / Y Answered" shows correct values from question 1
      const leaderboardRef = doc(firestore, 'games', gameId, 'aggregates', 'leaderboard');
      await setDoc(leaderboardRef, {
        topPlayers: [],
        totalPlayers: players?.length || 0,
        totalAnswered: 0,
        answerCounts: [],
        lastUpdated: serverTimestamp(),
      });

      // Now start the game
      const updateData = { state: 'preparing' as const };
      await updateDoc(gameRef, updateData);
      router.push(`/host/game/${gameId}`);
    } catch (error) {
      console.error("Error starting game: ", error);
      const permissionError = new FirestorePermissionError({
        path: gameRef.path,
        operation: 'update',
        requestResourceData: { state: 'preparing' }
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleCancelGame = () => {
    if (!gameRef) return;
    deleteDoc(gameRef)
        .then(() => {
            router.push('/host');
        })
        .catch((error) => {
            console.error("Error deleting game: ", error);
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
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl space-y-12 text-center">
            <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">Your Quiz is Ready!</h1>
                <p className="text-muted-foreground text-xl">Players can now join your game.</p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
              <CardHeader className="p-6">
                <CardDescription className="text-sm font-semibold tracking-wider uppercase mb-4">GAME PIN</CardDescription>
                {gameLoading ? <Skeleton className="h-20 w-56 mx-auto rounded-xl" /> : (
                  <CardTitle className="text-7xl font-mono tracking-widest flex items-center justify-center gap-4">
                    {game?.gamePin}
                    {game?.gamePin && <CopyButton text={game.gamePin} />}
                  </CardTitle>
                )}
              </CardHeader>
            </Card>

            <Card className="border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
              <CardHeader className="p-6">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <QrCode className="h-5 w-5 text-primary" />
                  <CardDescription className="text-sm font-semibold tracking-wider uppercase">SCAN TO JOIN</CardDescription>
                </div>
                {gameLoading || !joinUrl ? (
                  <Skeleton className="h-52 w-52 mx-auto rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <QRCodeSVG
                        value={joinUrl}
                        size={192}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(joinUrl)}
                      className="text-sm px-4 py-2 rounded-lg"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                )}
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="border border-card-border shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl">
              <CardHeader className="flex-row items-center gap-3 p-6">
                <Users className="text-primary h-6 w-6" />
                <CardTitle className="text-2xl font-semibold">
                  Players Joined ({playersLoading || gameLoading ? '...' : players?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </div>
                ) : (
                  <ul className="space-y-3 text-left">
                    {players?.map(player => (
                      <li key={player.id} className="p-4 bg-muted rounded-xl font-medium text-lg transition-all duration-200 hover:bg-muted/80">
                        {player.name}
                      </li>
                    ))}
                    {players?.length === 0 && <p className="text-muted-foreground text-center p-8 text-lg">Waiting for players to join...</p>}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary shadow-lg flex flex-col justify-center items-center p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5">
                <CardTitle className="text-3xl font-semibold mb-3">Ready to Start?</CardTitle>
                <CardDescription className="mb-8 text-base">Once you begin, no more players can join.</CardDescription>
                <Button
                  onClick={handleStartGame}
                  className="text-lg px-12 py-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold shadow-lg"
                >
                    Start Game
                </Button>
            </Card>
          </div>
        </div>

        <div className="mt-12 border-t border-border w-full max-w-5xl pt-8 flex justify-center">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="px-6 py-4 rounded-xl">
                        <XCircle className="mr-2 h-5 w-5" />
                        Cancel Game
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl shadow-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-semibold">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                            This will cancel the game for all players and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                            Yes, Cancel Game
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </main>
    </div>
  );
}

    

    
