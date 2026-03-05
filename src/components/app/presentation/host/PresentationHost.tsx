'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { usePresentationById } from '@/firebase/presentation/use-presentation';
import { usePresentationControls } from '@/firebase/presentation/use-presentation-game';
import { HostSlideCanvas } from './HostSlideCanvas';
import { HostOverlay } from './HostOverlay';
import { HostControls } from './HostControls';
import { ReactionOverlay } from './ReactionOverlay';
import { ReactionCountBar } from './ReactionCountBar';
import type { PresentationGame } from '@/lib/types';

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

export function PresentationHost({ game, players }: PresentationHostProps) {
  const router = useRouter();
  const { presentation, loading } = usePresentationById(game.presentationId);
  const controls = usePresentationControls(game.id);

  // Auto-start/clear timer when slide changes
  const timerStartedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!presentation || game.state !== 'active') return;

    const slide = presentation.slides[game.currentSlideIndex];
    if (!slide) return;

    const quizElement = slide.elements.find(
      (el) => el.type === 'quiz' && el.quizConfig && el.quizConfig.timeLimit > 0
    );

    if (quizElement) {
      // Only start timer if we haven't started it for this element already
      if (timerStartedForRef.current !== quizElement.id) {
        timerStartedForRef.current = quizElement.id;
        controls.startSlideTimer(quizElement.id);
      }
    } else {
      // Non-quiz slide — clear timer if one was running
      if (timerStartedForRef.current) {
        timerStartedForRef.current = null;
        controls.clearSlideTimer();
      }
    }
  }, [game.currentSlideIndex, game.state, presentation, controls]);

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

  const currentSlide = presentation.slides[game.currentSlideIndex];
  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Invalid slide index
      </div>
    );
  }

  const playerNames = players.map((p) => p.name);

  const handleEnd = () => {
    controls.endPresentation();
    router.push('/host');
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 16:9 canvas centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw]">
          <AnimatePresence mode="wait">
            <motion.div
              key={game.currentSlideIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full"
            >
              <HostSlideCanvas
                slide={currentSlide}
                slides={presentation.slides}
                gameId={game.id}
                playerCount={players.length}
                playerNames={playerNames}
                timerStartedAt={game.timerStartedAt ?? null}
                timerElementId={game.timerElementId ?? null}
              />
            </motion.div>
          </AnimatePresence>

          {/* Overlay: PIN, slide counter, player count */}
          <HostOverlay
            gamePin={game.gamePin}
            slideIndex={game.currentSlideIndex}
            totalSlides={presentation.slides.length}
            playerCount={players.length}
          />

          {/* Reactions floating up + counts bar */}
          {game.settings.enableReactions && (
            <>
              <ReactionOverlay gameId={game.id} />
              <ReactionCountBar gameId={game.id} />
            </>
          )}

          {/* Navigation controls (show on hover) */}
          <HostControls
            slideIndex={game.currentSlideIndex}
            totalSlides={presentation.slides.length}
            gameState={game.state}
            onNextSlide={() => controls.nextSlide(game.currentSlideIndex, presentation.slides.length)}
            onPrevSlide={() => controls.prevSlide(game.currentSlideIndex)}
            onPause={controls.pausePresentation}
            onResume={controls.startPresentation}
            onEnd={handleEnd}
          />
        </div>
      </div>
    </div>
  );
}
