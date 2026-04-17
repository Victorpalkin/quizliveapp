'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { usePresentationGame } from '@/firebase/presentation';
import { PresentationHost } from '@/components/app/presentation/host/PresentationHost';
import { useHostSession } from '../../../hooks/use-host-session';

export default function PresentPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { game, players, loading: gameLoading } = usePresentationGame(gameId);

  useHostSession({
    gameId,
    game,
    contentId: game?.presentationId || '',
    contentTitle: 'Presentation',
    userId: user?.uid,
    activityType: 'presentation',
    returnPath: `/host/presentation/present/${gameId}`,
  });

  if (authLoading || gameLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Game not found
      </div>
    );
  }

  return <PresentationHost game={game} players={players} />;
}
