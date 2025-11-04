'use client';
// A simple client component to handle copy-to-clipboard

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Copy, Check } from 'lucide-react';
import { Header } from '@/components/app/header';
import { mockPlayers } from '@/lib/mock-data';

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


export default function HostLobbyPage({ params: { gameId } }: { params: { gameId: string } }) {
  const upperCaseGameId = gameId.toUpperCase();
  const playerList = mockPlayers.slice(0, 5); // Mock 5 players

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
              <CardTitle className="text-6xl font-mono tracking-widest flex items-center justify-center gap-4">
                {upperCaseGameId}
                <CopyButton text={upperCaseGameId} />
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Users className="text-primary" />
                <CardTitle>Players Joined ({playerList.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-left">
                  {playerList.map(player => (
                    <li key={player.id} className="p-3 bg-background/50 rounded-md font-medium">
                      {player.name}
                    </li>
                  ))}
                  {playerList.length === 0 && <p className="text-muted-foreground text-center p-4">Waiting for players to join...</p>}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground flex flex-col justify-center items-center p-8">
                <CardTitle className="text-3xl">Ready to Start?</CardTitle>
                <CardDescription className="text-primary-foreground/80 my-4">Once you begin, no more players can join.</CardDescription>
                <Button asChild size="lg" variant="secondary" className="text-xl px-12 py-8">
                  <Link href={`/host/game/${upperCaseGameId}`}>
                    Start Game
                  </Link>
                </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
