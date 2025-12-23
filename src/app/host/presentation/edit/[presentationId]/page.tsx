'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { PresentationEditor } from '@/components/app/presentation';
import { useUser } from '@/firebase';
import {
  usePresentation,
  usePresentationMutations,
  useCreatePresentationGame,
} from '@/firebase/presentation';
import { Presentation } from '@/lib/types';

export default function EditPresentationPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.presentationId as string;

  const { user, loading: userLoading } = useUser();
  const { presentation, loading: presentationLoading } = usePresentation(presentationId);
  const { updatePresentation, isLoading: isSaving } = usePresentationMutations();
  const { createGame, isLoading: isCreatingGame } = useCreatePresentationGame();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Handle save
  const handleSave = useCallback(
    async (data: Partial<Presentation>) => {
      await updatePresentation(presentationId, data);
    },
    [presentationId, updatePresentation]
  );

  // Handle launch presentation
  const handleLaunch = useCallback(async () => {
    if (!user) return;

    try {
      const gameId = await createGame(presentationId, user.uid);
      router.push(`/host/presentation/lobby/${gameId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  }, [presentationId, user, createGame, router]);

  // Loading state
  if (userLoading || presentationLoading) {
    return <FullPageLoader />;
  }

  // Not found
  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Presentation not found</h1>
        <button
          onClick={() => router.push('/host')}
          className="text-primary underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  // Check ownership
  if (presentation.hostId !== user?.uid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access denied</h1>
        <p className="text-muted-foreground mb-4">
          You don&apos;t have permission to edit this presentation.
        </p>
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
    <PresentationEditor
      presentation={presentation}
      onSave={handleSave}
      onLaunch={handleLaunch}
      isSaving={isSaving || isCreatingGame}
    />
  );
}
