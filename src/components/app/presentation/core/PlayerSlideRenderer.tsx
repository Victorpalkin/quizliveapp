'use client';

import { AnimatePresence } from 'motion/react';
import { PresentationSlide, Presentation, PresentationGame } from '@/lib/types';
import { getSlideType, SlidePlayerProps, SlideResponse } from '../slide-types';

interface PlayerSlideRendererProps {
  slide: PresentationSlide;
  presentation: Presentation;
  game: PresentationGame;
  playerId: string;
  playerName: string;
  hasResponded: boolean;
  onSubmit: (response: SlideResponse) => Promise<void>;
}

/**
 * Dispatches to the correct player component based on slide type
 */
export function PlayerSlideRenderer({
  slide,
  presentation,
  game,
  playerId,
  playerName,
  hasResponded,
  onSubmit,
}: PlayerSlideRendererProps) {
  const slideType = getSlideType(slide.type);
  const PlayerComponent = slideType.PlayerComponent;

  const props: SlidePlayerProps = {
    slide,
    presentation,
    game,
    playerId,
    playerName,
    hasResponded,
    onSubmit,
  };

  return (
    <AnimatePresence mode="wait">
      <PlayerComponent key={slide.id} {...props} />
    </AnimatePresence>
  );
}
