'use client';

import { AnimatePresence } from 'motion/react';
import { PresentationSlide, Presentation, PresentationGame } from '@/lib/types';
import { getSlideType, SlideHostProps } from '../slide-types';

interface SlideRendererProps {
  slide: PresentationSlide;
  presentation: Presentation;
  game: PresentationGame;
  slideIndex: number;
  totalSlides: number;
  playerCount: number;
  responseCount: number;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Dispatches to the correct host slide component based on slide type
 */
export function SlideRenderer({
  slide,
  presentation,
  game,
  slideIndex,
  totalSlides,
  playerCount,
  responseCount,
  onNext,
  onPrevious,
}: SlideRendererProps) {
  const slideType = getSlideType(slide.type);
  const HostComponent = slideType.HostComponent;

  const props: SlideHostProps = {
    slide,
    presentation,
    game,
    slideIndex,
    totalSlides,
    playerCount,
    responseCount,
    onNext,
    onPrevious,
    isFirstSlide: slideIndex === 0,
    isLastSlide: slideIndex === totalSlides - 1,
  };

  return (
    <AnimatePresence mode="wait">
      <HostComponent key={slide.id} {...props} />
    </AnimatePresence>
  );
}
