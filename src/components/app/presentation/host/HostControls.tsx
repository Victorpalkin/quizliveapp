'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PacingStatus } from '@/hooks/presentation/use-pacing-status';
import { cn } from '@/lib/utils';

interface HostControlsProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  isVisible: boolean;
  pacingStatus?: PacingStatus;
}

// Force advance hold duration in ms
const FORCE_ADVANCE_DURATION = 2000;

export function HostControls({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  isVisible,
  pacingStatus,
}: HostControlsProps) {
  const canGoPrevious = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  // Force advance state (hold to advance when threshold not met)
  const [forceProgress, setForceProgress] = useState(0);
  const [isForcing, setIsForcing] = useState(false);
  const forceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Determine if pacing blocks the next button
  const isPacingEnabled = pacingStatus?.isInteractiveSlide && pacingStatus.pacingMode !== 'none';
  const isWaitingForResponses = isPacingEnabled && !pacingStatus?.thresholdMet;

  // Clear force interval on unmount or when threshold is met
  useEffect(() => {
    if (!isWaitingForResponses && forceIntervalRef.current) {
      clearInterval(forceIntervalRef.current);
      forceIntervalRef.current = null;
      setForceProgress(0);
      setIsForcing(false);
    }
  }, [isWaitingForResponses]);

  // Handle force advance hold
  const handleForceStart = useCallback(() => {
    if (!isWaitingForResponses || !canGoNext) return;

    setIsForcing(true);
    startTimeRef.current = Date.now();

    forceIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / FORCE_ADVANCE_DURATION) * 100, 100);
      setForceProgress(progress);

      if (progress >= 100) {
        // Force advance triggered
        clearInterval(forceIntervalRef.current!);
        forceIntervalRef.current = null;
        setForceProgress(0);
        setIsForcing(false);
        onNext();
      }
    }, 50);
  }, [isWaitingForResponses, canGoNext, onNext]);

  const handleForceEnd = useCallback(() => {
    if (forceIntervalRef.current) {
      clearInterval(forceIntervalRef.current);
      forceIntervalRef.current = null;
    }
    setForceProgress(0);
    setIsForcing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (forceIntervalRef.current) {
        clearInterval(forceIntervalRef.current);
      }
    };
  }, []);

  // Handle normal next click
  const handleNextClick = useCallback(() => {
    if (!isWaitingForResponses) {
      onNext();
    }
    // If waiting for responses, force advance is handled by hold
  }, [isWaitingForResponses, onNext]);

  return (
    <motion.div
      className="absolute bottom-6 right-6 flex items-center gap-2 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        variant="secondary"
        size="icon"
        className="h-12 w-12 rounded-full bg-white/90 hover:bg-white shadow-lg"
        onClick={onPrevious}
        disabled={!canGoPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {isWaitingForResponses ? (
        // Waiting for responses - show hold-to-advance button
        <Button
          variant="secondary"
          size="lg"
          className={cn(
            'h-12 px-6 rounded-full shadow-lg relative overflow-hidden',
            'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300',
            !canGoNext && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!canGoNext}
          onMouseDown={handleForceStart}
          onMouseUp={handleForceEnd}
          onMouseLeave={handleForceEnd}
          onTouchStart={handleForceStart}
          onTouchEnd={handleForceEnd}
        >
          {/* Force advance progress overlay */}
          {isForcing && (
            <motion.div
              className="absolute inset-0 bg-amber-400/50"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: forceProgress / 100 }}
              style={{ transformOrigin: 'left' }}
            />
          )}
          <span className="relative z-10 flex items-center">
            {isForcing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Hold...
              </>
            ) : (
              <>
                Waiting ({pacingStatus?.percentage}%)
                <ChevronRight className="h-5 w-5 ml-1" />
              </>
            )}
          </span>
        </Button>
      ) : (
        // Normal next button
        <Button
          variant="default"
          size="lg"
          className="h-12 px-6 rounded-full shadow-lg"
          onClick={handleNextClick}
          disabled={!canGoNext}
        >
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      )}
    </motion.div>
  );
}
