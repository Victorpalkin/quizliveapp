'use client';

import { motion, AnimatePresence } from 'motion/react';
import { PlayerSlideRenderer } from '../core';
import { WaitingScreen } from './WaitingScreen';
import { PresentationSlide, PresentationGameState } from '@/lib/types';
import { getSlideType } from '../slide-types';

interface PresentationPlayerProps {
  presentationTitle: string;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  gameState: PresentationGameState;
  playerId: string;
  playerName: string;
  gameId: string;
}

export function PresentationPlayer({
  presentationTitle,
  slides,
  currentSlideIndex,
  gameState,
  playerId,
  playerName,
  gameId,
}: PresentationPlayerProps) {
  const currentSlide = slides[currentSlideIndex];

  // Show waiting screen during lobby
  if (gameState === 'lobby') {
    return (
      <WaitingScreen
        presentationTitle={presentationTitle}
        message="Waiting for the presentation to start..."
      />
    );
  }

  // Show ended screen
  if (gameState === 'ended') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1 className="text-3xl font-bold text-foreground">
            Thanks for participating!
          </h1>
          <p className="text-muted-foreground text-lg">
            The presentation has ended
          </p>
        </motion.div>
      </div>
    );
  }

  // No current slide
  if (!currentSlide) {
    return <WaitingScreen presentationTitle={presentationTitle} />;
  }

  // Check if slide type is interactive
  const slideType = getSlideType(currentSlide.type);
  const isInteractive = slideType?.isInteractive !== false;

  // Show waiting screen for non-interactive slides (content)
  if (!isInteractive) {
    return (
      <WaitingScreen
        presentationTitle={presentationTitle}
        message="Waiting for the next activity..."
      />
    );
  }

  // Show interactive slide
  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          className="min-h-screen"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <PlayerSlideRenderer
            slide={currentSlide}
            playerId={playerId}
            playerName={playerName}
            gameId={gameId}
            slideIndex={currentSlideIndex}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
