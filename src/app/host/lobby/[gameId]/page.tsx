
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
import { collection, doc, updateDoc, DocumentReference, deleteDoc } from 'firebase/firestore';
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
    <Button variant="outline" size="icon" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
  
  const handleStartGame = () => {
    if (!gameRef) return;
    const updateData = { state: 'preparing' as const };
    updateDoc(gameRef, updateData)
      .then(() => {
        router.push(`/host/game/${gameId}`);
      })
      .catch((error) => {
        console.error("Error starting game: ", error);
        const permissionError = new FirestorePermissionError({
          path: gameRef.path,
          operation: 'update',
          requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl space-y-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter">Your Quiz is Ready!</h1>
            <p className="text-muted-foreground text-xl">Players can now join your game.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardDescription>GAME PIN</CardDescription>
                {gameLoading ? <Skeleton className="h-16 w-48 mx-auto" /> : (
                  <CardTitle className="text-6xl font-mono tracking-widest flex items-center justify-center gap-4">
                    {game?.gamePin}
                    {game?.gamePin && <CopyButton text={game.gamePin} />}
                  </CardTitle>
                )}
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 justify-center mb-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <CardDescription>SCAN TO JOIN</CardDescription>
                </div>
                {gameLoading || !joinUrl ? (
                  <Skeleton className="h-48 w-48 mx-auto" />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-lg">
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
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                )}
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Users className="text-primary" />
                <CardTitle>
                  Players Joined ({playersLoading || gameLoading ? '...' : players?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <ul className="space-y-2 text-left">
                    {players?.map(player => (
                      <li key={player.id} className="p-3 bg-background/50 rounded-md font-medium">
                        {player.name}
                      </li>
                    ))}
                    {players?.length === 0 && <p className="text-muted-foreground text-center p-4">Waiting for players to join...</p>}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-8 border-l-primary shadow-xl flex flex-col justify-center items-center p-8 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="text-3xl">Ready to Start?</CardTitle>
                <CardDescription className="my-4">Once you begin, no more players can join.</CardDescription>
                <Button
                  onClick={handleStartGame}
                  size="lg"
                  className="text-xl px-12 py-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                    Start Game
                </Button>
            </Card>
          </div>
        </div>

        <div className="mt-12 border-t w-full max-w-4xl pt-6 flex justify-center">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Game
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will cancel the game for all players and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

    

    
