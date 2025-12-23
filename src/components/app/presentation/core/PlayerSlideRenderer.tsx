'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { PresentationSlide, Presentation, PresentationGame } from '@/lib/types';
import { getSlideType, SlidePlayerProps, SlideResponse } from '../slide-types';

export interface PlayerSlideRendererProps {
  slide: PresentationSlide;
  presentation?: Presentation;
  game?: PresentationGame;
  playerId: string;
  playerName?: string;
  gameId?: string;
  onSubmit?: (response: SlideResponse) => Promise<void>;
}

/**
 * Dispatches to the correct player component based on slide type.
 * Can be called with minimal props for simple display.
 */
export function PlayerSlideRenderer({
  slide,
  presentation,
  game,
  playerId,
  playerName = '',
  gameId = '',
  onSubmit,
}: PlayerSlideRendererProps) {
  const [hasResponded, setHasResponded] = useState(false);
  const slideType = getSlideType(slide.type);
  const PlayerComponent = slideType.PlayerComponent;

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
    id: gameId,
    hostId: '',
    gamePin: '',
    activityType: 'presentation',
    presentationId: '',
    state: 'presenting',
    currentSlideIndex: 0,
  };

  const handleSubmit = useCallback(
    async (response: SlideResponse) => {
      setHasResponded(true);
      if (onSubmit) {
        await onSubmit(response);
      }
    },
    [onSubmit]
  );

  const props: SlidePlayerProps = {
    slide,
    presentation: stubPresentation,
    game: stubGame,
    playerId,
    playerName,
    hasResponded,
    onSubmit: handleSubmit,
  };

  return (
    <AnimatePresence mode="wait">
      <PlayerComponent key={slide.id} {...props} />
    </AnimatePresence>
  );
}
