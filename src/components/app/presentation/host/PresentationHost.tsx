'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlideRenderer } from '../core';
import { HostOverlay } from './HostOverlay';
import { HostControls } from './HostControls';
import { PresentationSlide, Presentation } from '@/lib/types';
import { usePacingStatus } from '@/hooks/presentation/use-pacing-status';

interface PresentationHostProps {
  gameId: string;
  gamePin: string;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  playerCount: number;
  presentation: Presentation;
  onSlideChange: (index: number) => void;
  onCancel?: () => void;
}

export function PresentationHost({
  gameId,
  gamePin,
  slides,
  currentSlideIndex,
  playerCount,
  presentation,
  onSlideChange,
  onCancel,
}: PresentationHostProps) {
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [lastMouseMove, setLastMouseMove] = useState(Date.now());

  const currentSlide = slides[currentSlideIndex];

  // Pacing status for current slide
  const pacingStatus = usePacingStatus(
    gameId,
    currentSlide?.id,
    currentSlide,
    presentation,
    playerCount
  );

  // Determine if pacing blocks navigation
  const isPacingBlocked =
    pacingStatus.isInteractiveSlide &&
    pacingStatus.pacingMode !== 'none' &&
    !pacingStatus.thresholdMet;

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setLastMouseMove(Date.now());
      setIsControlsVisible(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      setLastMouseMove(Date.now());
      setIsControlsVisible(true);

      // Keyboard navigation (respects pacing for forward navigation)
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // Block forward navigation if pacing threshold not met
        if (!isPacingBlocked && currentSlideIndex < slides.length - 1) {
          onSlideChange(currentSlideIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          onSlideChange(currentSlideIndex - 1);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlideIndex, slides.length, onSlideChange, isPacingBlocked]);

  // Hide controls after 3 seconds of no activity
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastMouseMove > 3000) {
        setIsControlsVisible(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastMouseMove]);

  const handlePrevious = useCallback(() => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, onSlideChange]);

  const handleNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      onSlideChange(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, onSlideChange]);

  if (!currentSlide) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <p className="text-xl text-muted-foreground">No slides in this presentation</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Slide content - full screen */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <SlideRenderer slide={currentSlide} />
        </motion.div>
      </AnimatePresence>

      {/* Host overlay (top bar with PIN, etc.) */}
      <HostOverlay
        gamePin={gamePin}
        currentSlide={currentSlideIndex + 1}
        totalSlides={slides.length}
        playerCount={playerCount}
        onCancel={onCancel}
        pacingStatus={pacingStatus}
      />

      {/* Floating navigation controls */}
      <HostControls
        currentSlide={currentSlideIndex}
        totalSlides={slides.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isVisible={isControlsVisible}
        pacingStatus={pacingStatus}
      />
    </div>
  );
}
