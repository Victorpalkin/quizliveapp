'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { useFirestore } from '@/firebase';
import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  usePresentationGameByPin,
  usePresentationPlayers,
  usePresentation,
} from '@/firebase/presentation';
import { PresentationPlayer, WaitingScreen } from '@/components/app/presentation';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getPlayerSession,
  savePlayerSession,
} from '@/lib/player-session';
import { useWakeLock } from '@/hooks/use-wake-lock';

type PlayerState = 'loading' | 'joining' | 'joined' | 'not_found' | 'error';

export default function PresentationPlayerPage() {
  const params = useParams();
  const gamePin = params.gamePin as string;
  const router = useRouter();
  const firestore = useFirestore();

  // Keep screen awake during presentation
  useWakeLock(true);

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Firebase data
  const { game, loading: gameLoading } = usePresentationGameByPin(gamePin);
  const { presentation, loading: presentationLoading } = usePresentation(
    game?.presentationId || ''
  );
  const { players } = usePresentationPlayers(game?.id || '');

  // Check for existing session on mount
  useEffect(() => {
    const session = getPlayerSession();
    if (session && session.gamePin === gamePin) {
      setPlayerId(session.playerId);
      setPlayerName(session.nickname);
      setGameId(session.gameDocId);
      setPlayerState('joined');
    } else {
      setPlayerId(nanoid());
      setPlayerState('joining');
    }
  }, [gamePin]);

  // Update gameId when game loads
  useEffect(() => {
    if (game && !gameId) {
      setGameId(game.id);
    }
  }, [game, gameId]);

  // Handle game not found
  useEffect(() => {
    if (!gameLoading && !game) {
      setPlayerState('not_found');
    }
  }, [game, gameLoading]);

  // Join the game
  const handleJoin = useCallback(async () => {
    if (!nameInput.trim() || !game) return;

    try {
      setError('');
      const trimmedName = nameInput.trim();

      // Create player document
      const playerRef = doc(
        collection(firestore, 'games', game.id, 'players'),
        playerId
      );
      await setDoc(playerRef, {
        name: trimmedName,
        score: 0,
        joinedAt: serverTimestamp(),
      });

      // Save session
      savePlayerSession(playerId, game.id, gamePin, trimmedName);

      setPlayerName(trimmedName);
      setGameId(game.id);
      setPlayerState('joined');
    } catch (err) {
      console.error('Failed to join game:', err);
      setError('Failed to join. Please try again.');
    }
  }, [nameInput, game, playerId, gamePin, firestore]);

  // Loading state
  if (playerState === 'loading' || gameLoading || presentationLoading) {
    return <FullPageLoader />;
  }

  // Game not found
  if (playerState === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Game Not Found</CardTitle>
            <CardDescription>
              The game with PIN {gamePin} doesn&apos;t exist or has ended.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push('/join')}
            >
              Try Another PIN
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join screen
  if (playerState === 'joining') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Join Presentation</CardTitle>
            <CardDescription>
              {presentation?.title || 'Enter your name to participate'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
              maxLength={20}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={!nameInput.trim()}
            >
              Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Joined - show presentation player
  if (!game || !presentation) {
    return <WaitingScreen presentationTitle="Loading..." />;
  }

  return (
    <PresentationPlayer
      presentationTitle={presentation.title}
      slides={presentation.slides}
      currentSlideIndex={game.currentSlideIndex}
      gameState={game.state}
      playerId={playerId}
      gameId={gameId}
    />
  );
}
