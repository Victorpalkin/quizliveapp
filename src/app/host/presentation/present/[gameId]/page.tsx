'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  usePresentationGame,
  usePresentationPlayers,
  usePresentationGameControls,
  usePresentation,
} from '@/firebase/presentation';
import { PresentationHost } from '@/components/app/presentation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { clearHostSession, saveHostSession } from '@/lib/host-session';

export default function PresentationPresentPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const { game, loading: gameLoading } = usePresentationGame(gameId);
  const { players } = usePresentationPlayers(gameId);
  const { goToSlide, endPresentation } = usePresentationGameControls(gameId);
  const { presentation, loading: presentationLoading } = usePresentation(
    game?.presentationId || ''
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Save host session
  useEffect(() => {
    if (game && presentation && user) {
      saveHostSession(
        gameId,
        game.gamePin,
        game.presentationId,
        presentation.title,
        user.uid,
        'presentation',
        'presenting'
      );
    }
  }, [gameId, game, presentation, user]);

  // Redirect if game ended
  useEffect(() => {
    if (game?.state === 'ended') {
      clearHostSession();
      router.push('/host');
    }
  }, [game?.state, router]);

  // Redirect to lobby if still in lobby state
  useEffect(() => {
    if (game?.state === 'lobby') {
      router.push(`/host/presentation/lobby/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  const handleSlideChange = useCallback(
    (index: number) => {
      goToSlide(index);
    },
    [goToSlide]
  );

  const handleCancel = useCallback(async () => {
    clearHostSession();
    await endPresentation();
    router.push('/host');
  }, [endPresentation, router]);

  if (userLoading || gameLoading || presentationLoading) {
    return <FullPageLoader />;
  }

  if (!game || !presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <h1 className="text-2xl font-bold text-foreground mb-4">Presentation not found</h1>
        <button
          onClick={() => router.push('/host')}
          className="text-primary underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <PresentationHost
      gamePin={game.gamePin}
      slides={presentation.slides}
      currentSlideIndex={game.currentSlideIndex}
      playerCount={players.length}
      onSlideChange={handleSlideChange}
      onCancel={handleCancel}
    />
  );
}
