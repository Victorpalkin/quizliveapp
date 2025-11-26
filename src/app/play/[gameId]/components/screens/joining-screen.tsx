import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface JoiningScreenProps {
  nickname: string;
  setNickname: (nickname: string) => void;
  onJoinGame: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export function JoiningScreen({ nickname, setNickname, onJoinGame, isLoading }: JoiningScreenProps) {
  return (
    <div className="text-center w-full max-w-sm">
      <h1 className="text-4xl font-bold">Join Game</h1>
      <form onSubmit={onJoinGame} className="space-y-4 mt-8">
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
          className="h-12 text-center text-xl"
          maxLength={20}
          minLength={2}
          required
          disabled={isLoading}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Joining...
            </>
          ) : (
            'Join'
          )}
        </Button>
      </form>
    </div>
  );
}
