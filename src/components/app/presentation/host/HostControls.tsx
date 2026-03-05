'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react';
import type { PresentationGameState } from '@/lib/types';

interface HostControlsProps {
  slideIndex: number;
  totalSlides: number;
  gameState: PresentationGameState;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

export function HostControls({
  slideIndex,
  totalSlides,
  gameState,
  onNextSlide,
  onPrevSlide,
  onPause,
  onResume,
  onEnd,
}: HostControlsProps) {
  const [visible, setVisible] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      onNextSlide();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      onPrevSlide();
    }
    if (e.key === 'Escape') {
      onEnd();
    }
  }, [onNextSlide, onPrevSlide, onEnd]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    let timer: ReturnType<typeof setTimeout>;

    const handleMove = () => {
      show();
      clearTimeout(timer);
      timer = setTimeout(hide, 3000);
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      clearTimeout(timer);
    };
  }, []);

  // Show dots for up to 20 slides; beyond that, just show the counter
  const showDots = totalSlides <= 20;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4 py-3 backdrop-blur-xl bg-black/30 border-t border-white/10"
        >
          {/* Slide progress dots */}
          {showDots && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSlides }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === slideIndex
                      ? 'w-6 h-1.5 bg-white'
                      : i < slideIndex
                        ? 'w-1.5 h-1.5 bg-white/50'
                        : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevSlide}
              disabled={slideIndex <= 0}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {gameState === 'paused' ? (
              <Button variant="ghost" size="icon" onClick={onResume} className="text-white hover:bg-white/20 h-10 w-10">
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={onPause} className="text-white hover:bg-white/20 h-10 w-10">
                <Pause className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onNextSlide}
              disabled={slideIndex >= totalSlides - 1}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            <Button variant="ghost" size="icon" onClick={onEnd} className="text-white hover:bg-white/20 h-10 w-10">
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
