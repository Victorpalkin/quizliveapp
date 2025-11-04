
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, Check } from 'lucide-react';
import { Header } from '@/components/app/header';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function HostLobbyPage({ params }: { params: { gameId: string } }) {
  const { gameId } = params;
  const router = useRouter();
  const firestore = useFirestore();

  const gameRef = useMemoFirebase(() => doc(firestore, 'games', gameId), [firestore, gameId]);
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  const playersQuery = useMemoFirebase(() => collection(firestore, 'games', gameId, 'players'), [firestore, gameId]);
  const { data: players, loading: playersLoading } = useCollection(playersQuery);
  
  const handleStartGame = async () => {
    await updateDoc(gameRef, { state: 'question' });
    router.push(`/host/game/${gameId}`);
  };


  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter">Your Quiz is Ready!</h1>
            <p className="text-muted-foreground text-xl">Players can now join your game.</p>
          <Card className="w-full max-w-md mx-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Users className="text-primary" />
                <CardTitle>Players Joined ({players?.length || 0})</CardTitle>
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

            <Card className="bg-primary text-primary-foreground flex flex-col justify-center items-center p-8">
                <CardTitle className="text-3xl">Ready to Start?</CardTitle>
                <CardDescription className="text-primary-foreground/80 my-4">Once you begin, no more players can join.</CardDescription>
                <Button onClick={handleStartGame} size="lg" variant="secondary" className="text-xl px-12 py-8">
                    Start Game
                </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

