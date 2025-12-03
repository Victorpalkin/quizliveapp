'use client';

/**
 * Player Router Page
 *
 * This is a thin routing layer that looks up the game by PIN and redirects
 * to the appropriate activity-specific player page:
 * - Quiz games → /play/quiz/{PIN}
 * - Interest Cloud → /play/interest-cloud/{PIN}
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

export default function PlayRouterPage() {
  const params = useParams();
  const gamePin = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const routeToGame = async () => {
      try {
        const gamesRef = collection(firestore, 'games');
        const q = query(gamesRef, where('gamePin', '==', gamePin));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Game not found. Please check the PIN and try again.');
          return;
        }

        const gameData = snapshot.docs[0].data();
        const activityType = gameData.activityType || 'quiz';

        // Route to appropriate player page
        if (activityType === 'interest-cloud') {
          router.replace(`/play/interest-cloud/${gamePin}`);
        } else {
          router.replace(`/play/quiz/${gamePin}`);
        }
      } catch (err) {
        console.error('Error routing to game:', err);
        setError('Could not load the game. Please try again.');
      }
    };

    routeToGame();
  }, [firestore, gamePin, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button
              onClick={() => router.push('/join')}
              size="lg"
              className="w-full"
            >
              <Home className="mr-2 h-5 w-5" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <FullPageLoader />;
}
