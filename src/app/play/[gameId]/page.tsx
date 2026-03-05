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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Search, Loader2 } from 'lucide-react';

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

export default function PlayRouterPage() {
  const params = useParams();
  const gamePin = (params.gameId as string).toUpperCase();
  const router = useRouter();
  const firestore = useFirestore();
  const [error, setError] = useState<GameError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const routeToGame = async () => {
      setIsLoading(true);
      try {
        const gamesRef = collection(firestore, 'games');
        const q = query(gamesRef, where('gamePin', '==', gamePin));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError(errorMessages['not-found']);
          setIsLoading(false);
          return;
        }

        const gameData = snapshot.docs[0].data();

        // Check if game has ended
        if (gameData.state === 'ended') {
          setError(errorMessages['ended']);
          setIsLoading(false);
          return;
        }

        const activityType = gameData.activityType || 'quiz';

        // Route to appropriate player page
        if (activityType === 'thoughts-gathering') {
          router.replace(`/play/thoughts-gathering/${gamePin}`);
        } else if (activityType === 'evaluation') {
          router.replace(`/play/evaluation/${gamePin}`);
        } else if (activityType === 'presentation') {
          router.replace(`/play/presentation/${gamePin}`);
        } else if (activityType === 'poll') {
          router.replace(`/play/poll/${gamePin}`);
        } else {
          // Default to quiz for backward compatibility
          router.replace(`/play/quiz/${gamePin}`);
        }
      } catch (err) {
        console.error('Error routing to game:', err);
        setError(errorMessages['network']);
        setIsLoading(false);
      }
    };

    routeToGame();
  }, [firestore, gamePin, router]);

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
              <Button
                onClick={() => router.push('/join')}
                size="lg"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Enter Different PIN
              </Button>
              {error.type === 'network' && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Try Again
                </Button>
              )}
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
