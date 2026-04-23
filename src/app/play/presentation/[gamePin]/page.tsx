'use client';

import { use } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PresentationPlayer } from '@/components/app/presentation/player/PresentationPlayer';
import { PlayerLeaveButton } from '@/components/app/player-leave-button';
import { useAnonymousAuth } from '@/hooks/use-anonymous-auth';
import { AuthErrorScreen } from '@/components/app/auth-error-screen';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { usePlayerStateMachine } from './hooks/use-player-state-machine';

export default function PlayPresentationPage({ params }: { params: Promise<{ gamePin: string }> }) {
  const { gamePin } = use(params);
  const { uid, loading: authLoading, error: authError, retry: retryAuth } = useAnonymousAuth();

  if (authError) return <AuthErrorScreen onRetry={retryAuth} />;

  if (authLoading || !uid) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  return <PresentationPlayerContent gamePin={gamePin} playerId={uid} />;
}

function PresentationPlayerContent({ gamePin, playerId }: { gamePin: string; playerId: string }) {
  const playerState = usePlayerStateMachine(gamePin, playerId);
  useWakeLock(playerState.state === 'lobby' || playerState.state === 'active');

  if (playerState.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!playerState.game) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
          <p className="text-muted-foreground">The game with PIN &quot;{gamePin}&quot; does not exist.</p>
          <Button asChild>
            <Link href="/join">Try Another PIN</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-6 left-6 z-20">
        <PlayerLeaveButton />
      </div>
      <PresentationPlayer {...playerState} />
    </div>
  );
}
