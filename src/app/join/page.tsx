
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/app/header';
import { Play } from 'lucide-react';

export default function JoinGamePage() {
  const [gamePin, setGamePin] = useState('');
  const router = useRouter();

  // Navigate directly to play page - validation happens there
  // This eliminates the duplicate Firestore query
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = gamePin.trim().toUpperCase();
    if (!pin) return;
    router.push(`/play/${pin}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-grid-small">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Play className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Join a Game</CardTitle>
            <CardDescription>Enter the Game PIN to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              <Input
                value={gamePin}
                onChange={(e) => setGamePin(e.target.value)}
                placeholder="GAME PIN"
                className="h-14 text-center text-2xl font-bold tracking-widest uppercase"
                maxLength={8}
                required
                autoComplete="off"
                autoCapitalize="characters"
              />
              <Button type="submit" size="lg" className="w-full bg-accent hover:bg-accent/90 text-lg">
                Enter
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
