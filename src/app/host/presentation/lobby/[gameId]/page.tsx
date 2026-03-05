'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from '@/components/ui/copy-button';
import { Users, Play, Loader2, Copy } from 'lucide-react';
import { useUser } from '@/firebase';
import { usePresentationGame, usePresentationControls } from '@/firebase/presentation/use-presentation-game';
import { saveHostSession } from '@/lib/host-session';

export default function PresentationLobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { game, players, loading: gameLoading } = usePresentationGame(gameId);
  const controls = usePresentationControls(gameId);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (game) {
      setJoinUrl(`${window.location.origin}/play/${game.gamePin}`);
    }
  }, [game]);

  // Save host session
  useEffect(() => {
    if (game && user) {
      saveHostSession(
        gameId,
        game.gamePin,
        game.presentationId,
        'Presentation',
        user.uid,
        'presentation',
        'lobby',
        `/host/presentation/lobby/${gameId}`
      );
    }
  }, [gameId, game, user]);

  // Redirect when game starts
  useEffect(() => {
    if (game?.state === 'active') {
      router.push(`/host/presentation/present/${gameId}`);
    }
  }, [game?.state, gameId, router]);

  if (authLoading || gameLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Game not found</p>
      </div>
    );
  }

  const handleStart = async () => {
    await controls.startPresentation();
    router.push(`/host/presentation/present/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      {/* Subtle background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-8 flex flex-col items-center min-h-screen">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-1">Zivo</h1>
          <p className="text-muted-foreground">Waiting for players to join</p>
        </motion.div>

        {/* PIN + QR section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row items-center gap-8 mb-10"
        >
          {/* Giant PIN */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Game PIN</p>
            <div className="glass rounded-2xl px-8 py-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="text-5xl md:text-6xl font-mono font-bold tracking-[0.3em] drop-shadow-[0_0_10px_rgba(147,51,234,0.15)]">
                  {game.gamePin}
                </span>
                <CopyButton text={game.gamePin} />
              </div>
            </div>
            {joinUrl && (
              <button
                onClick={() => navigator.clipboard.writeText(joinUrl)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
              >
                <Copy className="h-3 w-3" />
                {joinUrl}
              </button>
            )}
          </div>

          {/* QR Code — inline, prominent */}
          {joinUrl && (
            <div className="glass rounded-2xl p-4 shadow-xl">
              <p className="text-xs text-muted-foreground text-center mb-2">Scan to join</p>
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={joinUrl} size={160} level="M" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Player count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4"
        >
          <Users className="h-5 w-5 text-muted-foreground" />
          <motion.span
            key={players.length}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold"
          >
            {players.length}
          </motion.span>
          <span className="text-muted-foreground">
            {players.length === 1 ? 'player' : 'players'}
          </span>
        </motion.div>

        {/* Player tags */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl">
          <AnimatePresence>
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: i * 0.03,
                }}
                className="glass rounded-full px-4 py-1.5 text-sm font-medium shadow-sm"
              >
                {player.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground py-4 animate-glow-pulse"
            >
              Waiting for players to join...
            </motion.p>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md mb-8"
        >
          <Button
            onClick={handleStart}
            disabled={players.length === 0}
            size="lg"
            variant="gradient"
            className={`w-full h-16 text-lg shadow-xl ${
              players.length > 0 ? 'shadow-primary/25 animate-glow-pulse' : ''
            }`}
          >
            <Play className="h-6 w-6 mr-2" />
            Start Presentation
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
