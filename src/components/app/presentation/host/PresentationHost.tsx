'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { usePresentationById } from '@/firebase/presentation/use-presentation';
import { usePresentationControls } from '@/firebase/presentation/use-presentation-game';
import { useLeaderboard } from '@/firebase/presentation/use-leaderboard';
import { useResponseCount } from '@/firebase/presentation/use-responses';
import { HostSlideCanvas } from './HostSlideCanvas';
import { HostOverlay } from './HostOverlay';
import { HostControls } from './HostControls';
import { ReactionOverlay } from './ReactionOverlay';
import { ReactionCountBar } from './ReactionCountBar';
import { StreakBanner } from './StreakBanner';
import { Button } from '@/components/ui/button';
import { Trophy, BarChart3, Home } from 'lucide-react';
import type { PresentationGame, PresentationSlide } from '@/lib/types';

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation', 'agentic-designer', 'ai-step'];

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  maxStreak: number;
  joinedAt: Date;
}

interface PresentationHostProps {
  game: PresentationGame;
  players: Player[];
}

// ── Transition variants based on slide.transition ──

function getTransitionVariants(transition: PresentationSlide['transition'], direction: number) {
  switch (transition) {
    case 'none':
      return {
        initial: {},
        animate: {},
        exit: {},
        transition: { duration: 0 },
      };
    case 'slide':
      return {
        initial: { x: `${direction * 100}%`, opacity: 0 },
        animate: { x: '0%', opacity: 1 },
        exit: { x: `${-direction * 100}%`, opacity: 0 },
        transition: { duration: 0.4, ease: 'easeInOut' as const },
      };
    case 'zoom':
      return {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.1, opacity: 0 },
        transition: { duration: 0.4 },
      };
    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.4 },
      };
  }
}

export function PresentationHost({ game, players }: PresentationHostProps) {
  const router = useRouter();
  const { presentation, loading } = usePresentationById(game.presentationId);
  const controls = usePresentationControls(game.id);
  const { leaderboard } = useLeaderboard(game.id);

  const [ended, setEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelsPinned, setPanelsPinned] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevSlideIndexRef = useRef(game.currentSlideIndex);

  // Track slide direction for slide transitions
  const direction = game.currentSlideIndex >= prevSlideIndexRef.current ? 1 : -1;
  useEffect(() => {
    prevSlideIndexRef.current = game.currentSlideIndex;
  }, [game.currentSlideIndex]);

  // Detect if game was ended externally (e.g. reconnection)
  useEffect(() => {
    if (game.state === 'ended') {
      setEnded(true);
    }
  }, [game.state]);

  // ── Fullscreen ──

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        rootRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen not supported
    }
  }, []);

  // ── Auto-start/clear timer when slide changes ──

  const timerStartedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!presentation || game.state !== 'active') return;

    const slide = presentation.slides[game.currentSlideIndex];
    if (!slide) return;

    const quizElement = slide.elements.find(
      (el) => el.type === 'quiz' && el.quizConfig && el.quizConfig.timeLimit > 0
    );

    if (quizElement) {
      if (timerStartedForRef.current !== quizElement.id) {
        timerStartedForRef.current = quizElement.id;
        controls.startSlideTimer(quizElement.id);
      }
    } else {
      if (timerStartedForRef.current) {
        timerStartedForRef.current = null;
        controls.clearSlideTimer();
      }
    }
  }, [game.currentSlideIndex, game.state, presentation, controls]);

  // ── Pacing mode auto-advance ──

  const currentSlide = presentation?.slides[game.currentSlideIndex] ?? null;
  const interactiveElement = currentSlide?.elements.find(
    (el) => INTERACTIVE_TYPES.includes(el.type)
  ) ?? null;

  const responseCount = useResponseCount(
    game.id,
    interactiveElement?.id ?? null
  );

  const pacingAdvancedRef = useRef<string | null>(null);
  useEffect(() => {
    if (game.state !== 'active' || !interactiveElement || !presentation) return;

    const { pacingMode, pacingThreshold } = game.settings;
    if (pacingMode === 'free') return;

    const playerCount = players.length;
    if (playerCount === 0) return;

    // Don't auto-advance the same element twice
    if (pacingAdvancedRef.current === interactiveElement.id) return;

    let shouldAdvance = false;
    if (pacingMode === 'all' && responseCount >= playerCount) {
      shouldAdvance = true;
    } else if (pacingMode === 'threshold') {
      const pct = (responseCount / playerCount) * 100;
      if (pct >= pacingThreshold) {
        shouldAdvance = true;
      }
    }

    if (shouldAdvance) {
      pacingAdvancedRef.current = interactiveElement.id;
      // Brief delay so host can see the threshold was reached
      const timer = setTimeout(() => {
        controls.nextSlide(game.currentSlideIndex, presentation.slides.length);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    game.state, game.settings, game.currentSlideIndex,
    interactiveElement, responseCount, players.length,
    presentation, controls,
  ]);

  // Reset pacing ref when slide changes
  useEffect(() => {
    pacingAdvancedRef.current = null;
  }, [game.currentSlideIndex]);

  // ── Streak banner ──

  const topStreakPlayer = useMemo(() => {
    if (!game.settings.enableStreaks) return null;
    let best: Player | null = null;
    for (const p of players) {
      if (p.streak >= 3 && (!best || p.streak > best.streak)) {
        best = p;
      }
    }
    return best;
  }, [players, game.settings.enableStreaks]);

  // ── Canvas click handler ──

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, textarea, select, [role="button"], [data-controls], [data-interactive], [contenteditable]')) return;
      controls.nextSlide(game.currentSlideIndex, presentation?.slides.length ?? 0);
    },
    [controls, game.currentSlideIndex, presentation?.slides.length]
  );

  // ── End handler ──

  const handleEnd = useCallback(() => {
    controls.endPresentation();
    setEnded(true);
  }, [controls]);

  const togglePanels = useCallback(() => setPanelsPinned((p) => !p), []);

  // ── Loading / error states ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-white/60">Loading presentation...</span>
        </motion.div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Presentation not found
      </div>
    );
  }

  if (!currentSlide && !ended) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Invalid slide index
      </div>
    );
  }

  // ── End/summary screen ──

  if (ended) {
    const top3 = leaderboard.topPlayers.slice(0, 3);
    return (
      <div ref={rootRef} className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center text-white space-y-8 max-w-lg mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-6xl"
          >
            <Trophy className="h-16 w-16 mx-auto text-yellow-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold"
          >
            Presentation Complete
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 text-white/70"
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{players.length}</div>
              <div className="text-sm">Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{presentation.slides.length}</div>
              <div className="text-sm">Slides</div>
            </div>
          </motion.div>

          {top3.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold text-white/80">Top Players</h2>
              {top3.map((p, i) => (
                <div
                  key={p.playerId}
                  className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2.5"
                >
                  <span className="text-xl font-bold text-white/60 w-8">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="flex-1 text-left font-medium">{p.playerName}</span>
                  <span className="font-mono text-white/80">{p.score.toLocaleString()}</span>
                </div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
          >
            <Button
              onClick={() => router.push(`/host/presentation/analytics/${game.id}`)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button
              onClick={() => router.push('/host')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Active presentation ──

  const playerNames = players.map((p) => p.name);
  const variants = getTransitionVariants(currentSlide!.transition, direction);

  return (
    <div ref={rootRef} className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Overlay: PIN, slide counter, player count */}
      <HostOverlay
        gamePin={game.gamePin}
        slideIndex={game.currentSlideIndex}
        totalSlides={presentation.slides.length}
        playerCount={players.length}
        pinned={panelsPinned}
        onTogglePin={togglePanels}
      />

      {/* 16:9 canvas centered — padded when panels are pinned */}
      <div className={`absolute inset-0 flex items-center justify-center ${panelsPinned ? 'pt-[44px] pb-[68px]' : ''}`}>
        <div
          className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] cursor-pointer"
          onClick={handleCanvasClick}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={game.currentSlideIndex}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={variants.transition}
              className="w-full h-full"
            >
              <HostSlideCanvas
                slide={currentSlide!}
                slides={presentation.slides}
                gameId={game.id}
                presentationId={game.presentationId}
                playerCount={players.length}
                playerNames={playerNames}
                timerStartedAt={game.timerStartedAt ?? null}
                timerElementId={game.timerElementId ?? null}
              />
            </motion.div>
          </AnimatePresence>

          {/* Reactions floating up + counts bar */}
          {game.settings.enableReactions && (
            <>
              <ReactionOverlay gameId={game.id} />
              <ReactionCountBar gameId={game.id} />
            </>
          )}

          {/* Streak banner */}
          {topStreakPlayer && (
            <StreakBanner
              playerName={topStreakPlayer.name}
              streak={topStreakPlayer.streak}
            />
          )}
        </div>
      </div>

      {/* Navigation controls */}
      <HostControls
        slideIndex={game.currentSlideIndex}
        totalSlides={presentation.slides.length}
        gameState={game.state}
        slides={presentation.slides}
        onNextSlide={() => controls.nextSlide(game.currentSlideIndex, presentation.slides.length)}
        onPrevSlide={() => controls.prevSlide(game.currentSlideIndex)}
        onGoToSlide={controls.goToSlide}
        onPause={controls.pausePresentation}
        onResume={controls.startPresentation}
        onEnd={handleEnd}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        pinned={panelsPinned}
        onTogglePin={togglePanels}
      />
    </div>
  );
}
