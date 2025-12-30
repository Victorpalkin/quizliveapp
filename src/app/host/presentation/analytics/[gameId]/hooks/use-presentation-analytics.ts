import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { PresentationAnalytics, Presentation, Game } from '@/lib/types';

/**
 * Hook to fetch presentation analytics data.
 * Analytics are pre-computed and stored at games/{gameId}/aggregates/analytics
 */
export function usePresentationAnalytics(gameId: string) {
  const firestore = useFirestore();

  // Game document (for basic info and host verification)
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Presentation document (for title if needed)
  const presentationRef = useMemoFirebase(
    () => game?.presentationId ? doc(firestore, 'presentations', game.presentationId) as DocumentReference<Presentation> : null,
    [firestore, game?.presentationId]
  );
  const { data: presentation, loading: presentationLoading } = useDoc(presentationRef);

  // Analytics aggregate document
  const analyticsRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'analytics') as DocumentReference<PresentationAnalytics>,
    [firestore, gameId]
  );
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useDoc(analyticsRef);

  return {
    game,
    presentation,
    analytics,
    loading: gameLoading || presentationLoading || analyticsLoading,
    analyticsLoading,
    analyticsExists: analytics !== null,
    error: analyticsError,
  };
}
