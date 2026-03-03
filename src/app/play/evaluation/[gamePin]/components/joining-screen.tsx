'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface JoiningScreenProps {
  gamePin: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  isJoining: boolean;
  handleJoin: () => void;
}

export function JoiningScreen({ gamePin, playerName, setPlayerName, isJoining, handleJoin }: JoiningScreenProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>Join Evaluation Session</CardTitle>
        <CardDescription>PIN: {gamePin}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
            autoComplete="name"
            autoCapitalize="words"
          />
        </div>
        <Button
          onClick={handleJoin}
          disabled={!playerName.trim() || isJoining}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 active:scale-95 transition-transform"
        >
          {isJoining ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Join Session
        </Button>
      </CardContent>
    </Card>
  );
}
