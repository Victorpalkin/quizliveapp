'use client';

/**
 * Player Router Page
 *
 * This is a thin routing layer that looks up the game by PIN and redirects
 * to the appropriate activity-specific player page:
 * - Quiz games → /play/quiz/{PIN}
 * - Poll games → /play/poll/{PIN}
 * - Presentation games → /play/presentation/{PIN}
 * - Thoughts Gathering → /play/thoughts-gathering/{PIN}
 * - Evaluation → /play/evaluation/{PIN}
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Search, Loader2, RefreshCw } from 'lucide-react';
import { logError } from '@/lib/error-logging';

type ErrorType = 'not-found' | 'ended' | 'network' | null;

interface GameError {
  type: ErrorType;
  title: string;
  message: string;
  suggestion: string;
}

const errorMessages: Record<Exclude<ErrorType, null>, GameError> = {
  'not-found': {
    type: 'not-found',
    title: 'Game Not Found',
    message: 'We couldn\'t find a game with that PIN.',
    suggestion: 'Double-check the PIN and make sure you entered it correctly. PINs are case-insensitive.',
  },
  'ended': {
    type: 'ended',
    title: 'Game Has Ended',
    message: 'This game session has already finished.',
    suggestion: 'Ask the host for a new game PIN if they\'re starting another session.',
  },
  'network': {
    type: 'network',
    title: 'Connection Error',
    message: 'We couldn\'t connect to the game server.',
    suggestion: 'Check your internet connection and try again.',
  },
};

const LOOKUP_TIMEOUT_MS = 15_000;

export default function PlayRouterPage() {
  const params = useParams();
  const gamePin = (params.gameId as string).toUpperCase();
  const router = useRouter();
  const firestore = useFirestore();
  const [error, setError] = useState<GameError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    let settled = false;

    const gamesRef = collection(firestore, 'games');
    const q = query(gamesRef, where('gamePin', '==', gamePin));

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        logError(new Error('Game lookup timed out'), {
          context: 'PlayRouter:timeout',
          additionalInfo: { gamePin },
        });
        setError(errorMessages['network']);
        setIsLoading(false);
      }
    }, LOOKUP_TIMEOUT_MS);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty && snapshot.metadata.fromCache) {
          return;
        }

        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        if (snapshot.empty) {
          setError(errorMessages['not-found']);
          setIsLoading(false);
          return;
        }

        const gameData = snapshot.docs[0].data();

        if (gameData.state === 'ended') {
          setError(errorMessages['ended']);
          setIsLoading(false);
          return;
        }

        const activityType = gameData.activityType || 'quiz';

        if (activityType === 'thoughts-gathering') {
          router.replace(`/play/thoughts-gathering/${gamePin}`);
        } else if (activityType === 'evaluation') {
          router.replace(`/play/evaluation/${gamePin}`);
        } else if (activityType === 'presentation') {
          router.replace(`/play/presentation/${gamePin}`);
        } else if (activityType === 'poll') {
          router.replace(`/play/poll/${gamePin}`);
        } else {
          router.replace(`/play/quiz/${gamePin}`);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: 'PlayRouter:onSnapshot',
          additionalInfo: { gamePin },
        });
        setError(errorMessages['network']);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [firestore, gamePin, router, retryCount]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{error.title}</h2>
            <p className="text-muted-foreground mb-2">{error.message}</p>
            <p className="text-sm text-muted-foreground mb-6">{error.suggestion}</p>
            <div className="space-y-3">
              {(error.type === 'not-found' || error.type === 'network') && (
                <Button
                  onClick={() => setRetryCount((c) => c + 1)}
                  size="lg"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-5 w-5" /> Try Again
                </Button>
              )}
              <Button
                onClick={() => router.push('/join')}
                variant={error.type === 'ended' ? 'default' : 'outline'}
                size="lg"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Enter Different PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state with context
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Finding Game...</h2>
          <p className="text-muted-foreground mb-4">Looking for game <span className="font-mono font-bold">{gamePin}</span></p>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
