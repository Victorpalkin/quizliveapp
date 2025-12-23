'use client';

import { AnimatePresence } from 'motion/react';
import { PresentationSlide, Presentation, PresentationGame } from '@/lib/types';
import { getSlideType, SlideHostProps } from '../slide-types';

export interface SlideRendererProps {
  slide: PresentationSlide;
  presentation?: Presentation;
  game?: PresentationGame;
  slideIndex?: number;
  totalSlides?: number;
  playerCount?: number;
  responseCount?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

/**
 * Dispatches to the correct host slide component based on slide type.
 * Can be called with minimal props for simple display, or full props for
 * complete host functionality.
 */
export function SlideRenderer({
  slide,
  presentation,
  game,
  slideIndex = 0,
  totalSlides = 1,
  playerCount = 0,
  responseCount = 0,
  onNext = () => {},
  onPrevious = () => {},
}: SlideRendererProps) {
  const slideType = getSlideType(slide.type);
  const HostComponent = slideType.HostComponent;

  // Create stub objects if not provided
  const stubPresentation: Presentation = presentation || {
    id: '',
    title: '',
    hostId: '',
    slides: [slide],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const stubGame: PresentationGame = game || {
    id: '',
    hostId: '',
    gamePin: '',
    activityType: 'presentation',
    presentationId: '',
    state: 'presenting',
    currentSlideIndex: slideIndex,
  };

  const props: SlideHostProps = {
    slide,
    presentation: stubPresentation,
    game: stubGame,
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
