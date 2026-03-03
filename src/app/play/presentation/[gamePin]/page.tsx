'use client';

import { use } from 'react';
import { PresentationPlayer } from '@/components/app/presentation/player/PresentationPlayer';
import { usePlayerStateMachine } from './hooks/use-player-state-machine';

export default function PlayPresentationPage({ params }: { params: Promise<{ gamePin: string }> }) {
  const { gamePin } = use(params);
  const playerState = usePlayerStateMachine(gamePin);

  if (playerState.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Connecting...</p>
      </div>
    );
  }

  if (!playerState.game) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
          <p className="text-muted-foreground">The game with PIN &quot;{gamePin}&quot; does not exist.</p>
        </div>
      </div>
    );
  }

  return <PresentationPlayer {...playerState} />;
}
