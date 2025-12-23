'use client';

import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HostControlsProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  isVisible: boolean;
}

export function HostControls({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  isVisible,
}: HostControlsProps) {
  const canGoPrevious = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

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

      <Button
        variant="default"
        size="lg"
        className="h-12 px-6 rounded-full shadow-lg"
        onClick={onNext}
        disabled={!canGoNext}
      >
        Next
        <ChevronRight className="h-5 w-5 ml-1" />
      </Button>
    </motion.div>
  );
}
