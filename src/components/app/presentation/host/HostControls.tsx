'use client';

import { useEffect, useCallback } from 'react';
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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevSlide}
        disabled={slideIndex <= 0}
        className="text-white hover:bg-white/20"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {gameState === 'paused' ? (
        <Button variant="ghost" size="icon" onClick={onResume} className="text-white hover:bg-white/20">
          <Play className="h-5 w-5" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={onPause} className="text-white hover:bg-white/20">
          <Pause className="h-5 w-5" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onNextSlide}
        disabled={slideIndex >= totalSlides - 1}
        className="text-white hover:bg-white/20"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      <div className="w-px h-6 bg-white/30 mx-1" />

      <Button variant="ghost" size="icon" onClick={onEnd} className="text-white hover:bg-white/20">
        <Square className="h-4 w-4" />
      </Button>
    </div>
  );
}
