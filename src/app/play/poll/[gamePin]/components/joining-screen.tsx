'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Vote } from 'lucide-react';

interface JoiningScreenProps {
  nickname: string;
  setNickname: (value: string) => void;
  isJoining: boolean;
  allowAnonymous: boolean;
  handleJoinGame: () => void;
}

export function JoiningScreen({ nickname, setNickname, isJoining, allowAnonymous, handleJoinGame }: JoiningScreenProps) {
  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500 text-white">
          <Vote className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl">Join Poll</CardTitle>
        <CardDescription>
          {allowAnonymous
            ? 'Enter your name (optional for anonymous response)'
            : 'Enter your name to participate'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinGame();
          }}
          className="space-y-6"
        >
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={allowAnonymous ? "Your Name (optional)" : "Your Name"}
            className="h-14 text-center text-xl"
            maxLength={20}
            minLength={allowAnonymous ? 0 : 2}
            required={!allowAnonymous}
            autoComplete="name"
            autoCapitalize="words"
          />
          <Button
            type="submit"
            size="lg"
            disabled={isJoining || (!allowAnonymous && nickname.trim().length < 2)}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-lg"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
              </>
            ) : (
              'Join Poll'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
