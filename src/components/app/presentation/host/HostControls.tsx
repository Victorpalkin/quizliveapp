'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Pause, Play, Square, LayoutGrid, Maximize, Minimize, PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import type { PresentationGameState, PresentationSlide } from '@/lib/types';
import { SlideThumbnail } from '../shared/SlideThumbnail';

interface HostControlsProps {
  slideIndex: number;
  totalSlides: number;
  gameState: PresentationGameState;
  slides: PresentationSlide[];
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onGoToSlide: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
}

export function HostControls({
  slideIndex,
  totalSlides,
  gameState,
  slides,
  onNextSlide,
  onPrevSlide,
  onGoToSlide,
  onPause,
  onResume,
  onEnd,
  onToggleFullscreen,
  isFullscreen,
  pinned,
  onTogglePin,
}: HostControlsProps) {
  const [visible, setVisible] = useState(!!pinned);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const navigatorRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Single function to show controls and reset the shared hide timer
  const showControls = useCallback(() => {
    setVisible(true);
    if (pinned) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setNavigatorOpen(false);
    }, 3000);
  }, [pinned]);

  // When pinned changes, ensure visibility matches
  useEffect(() => {
    if (pinned) {
      setVisible(true);
      clearTimeout(hideTimerRef.current);
    }
  }, [pinned]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as Element;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.closest('[contenteditable]')
    ) {
      return;
    }

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      onNextSlide();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      onPrevSlide();
    }
    if (e.key === 'Escape') {
      if (navigatorOpen) {
        setNavigatorOpen(false);
      } else if (isFullscreen) {
        document.exitFullscreen?.();
      } else {
        setShowEndConfirm(true);
      }
    }
    if (e.key === 'g' || e.key === 'G') {
      setNavigatorOpen((prev) => !prev);
      showControls();
    }
    if ((e.key === 'f' || e.key === 'F') && onToggleFullscreen) {
      onToggleFullscreen();
    }
  }, [onNextSlide, onPrevSlide, navigatorOpen, isFullscreen, onToggleFullscreen, showControls]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (pinned) return;
    let lastCall = 0;
    const handleMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastCall < 100) return;
      lastCall = now;
      if (e.clientY >= window.innerHeight - 80) {
        showControls();
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [showControls, pinned]);

  // Scroll active thumbnail into view when navigator opens
  useEffect(() => {
    if (navigatorOpen && navigatorRef.current) {
      const activeThumb = navigatorRef.current.querySelector('[data-active="true"]');
      activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [navigatorOpen, slideIndex]);

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
          data-controls
        >
          {/* Slide navigator drawer */}
          <AnimatePresence>
            {navigatorOpen && (
              <motion.div
                ref={navigatorRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-white/20">
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      data-active={i === slideIndex}
                      className="flex-shrink-0 w-32 cursor-pointer rounded-md transition-all hover:ring-2 hover:ring-white/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGoToSlide(i);
                        setNavigatorOpen(false);
                      }}
                    >
                      <SlideThumbnail
                        slide={slide}
                        index={i}
                        isActive={i === slideIndex}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              onClick={(e) => { e.stopPropagation(); onPrevSlide(); }}
              disabled={slideIndex <= 0}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {gameState === 'paused' ? (
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onResume(); }} className="text-white hover:bg-white/20 h-10 w-10">
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onPause(); }} className="text-white hover:bg-white/20 h-10 w-10">
                <Pause className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onNextSlide(); }}
              disabled={slideIndex >= totalSlides - 1}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setNavigatorOpen((prev) => !prev); }}
              className={`text-white hover:bg-white/20 h-10 w-10 ${navigatorOpen ? 'bg-white/20' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>

            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowEndConfirm(true); }} className="text-white hover:bg-white/20 h-10 w-10">
              <Square className="h-4 w-4" />
            </Button>

            {onTogglePin && (
              <>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title={pinned ? 'Hide panels' : 'Pin panels'}
                >
                  {pinned ? <PanelBottomClose className="h-4 w-4" /> : <PanelBottomOpen className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* End presentation confirmation dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this presentation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the session for all players.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={onEnd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, End
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
