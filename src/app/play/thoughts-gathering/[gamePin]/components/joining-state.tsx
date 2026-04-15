'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare } from 'lucide-react';

interface JoiningStateProps {
  nickname: string;
  setNickname: (value: string) => void;
  isJoining: boolean;
  onJoin: () => void;
}

export function JoiningState({ nickname, setNickname, isJoining, onJoin }: JoiningStateProps) {
  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white">
          <MessageSquare className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl">Join Thoughts Gathering</CardTitle>
        <CardDescription>Enter your name to participate</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onJoin();
          }}
          className="space-y-6"
        >
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your Name"
            className="h-14 text-center text-xl"
            maxLength={20}
            minLength={2}
            required
            autoComplete="name"
            autoCapitalize="words"
          />
          <Button
            type="submit"
            size="lg"
            disabled={isJoining || nickname.trim().length < 2}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-lg"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
              </>
            ) : (
              'Join & Submit'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
