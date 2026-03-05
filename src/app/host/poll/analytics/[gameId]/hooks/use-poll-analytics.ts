import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import type { PollAnalytics, Game, PollActivity } from '@/lib/types';
import { gameConverter, pollActivityConverter } from '@/firebase/converters';

/**
 * Hook to fetch poll analytics data.
 * Analytics are pre-computed and stored at games/{gameId}/aggregates/poll-analytics
 */
export function usePollAnalytics(gameId: string) {
  const firestore = useFirestore();

  // Game document (for basic info and host verification)
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Poll activity document (for title and questions)
  const pollRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: poll, loading: pollLoading } = useDoc(pollRef);

  // Analytics aggregate document
  const analyticsRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId, 'aggregates', 'poll-analytics') as DocumentReference<PollAnalytics>,
    [firestore, gameId]
  );
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useDoc(analyticsRef);

  return {
    game,
    poll,
    analytics,
    loading: gameLoading || pollLoading || analyticsLoading,
    analyticsLoading,
    analyticsExists: analytics !== null,
    error: analyticsError,
  };
}
