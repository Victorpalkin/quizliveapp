'use client';

import { useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { PresentationSlide, Presentation, PresentationGame } from '@/lib/types';
import { getSlideType, SlidePlayerProps, SlideResponse } from '../slide-types';
import {
  usePlayerSlideResponse,
  useSubmitSlideResponse,
} from '@/firebase/presentation';

export interface PlayerSlideRendererProps {
  slide: PresentationSlide;
  presentation?: Presentation;
  game?: PresentationGame;
  playerId: string;
  playerName?: string;
  gameId?: string;
  slideIndex: number; // For submitAnswer questionIndex mapping
  onSubmit?: (response: SlideResponse) => Promise<void>;
  onResponseSubmitted?: () => void; // Callback when response is submitted (for state machine)
}

/**
 * Dispatches to the correct player component based on slide type.
 * Handles response persistence to Firestore automatically.
 */
export function PlayerSlideRenderer({
  slide,
  presentation,
  game,
  playerId,
  playerName = '',
  gameId = '',
  slideIndex,
  onSubmit,
  onResponseSubmitted,
}: PlayerSlideRendererProps) {
  // Check if player has already responded to this slide
  const { hasResponded, loading: responseLoading } = usePlayerSlideResponse(
    gameId,
    slide.id,
    playerId
  );

  // Hook for submitting responses
  const { submitResponse, isSubmitting } = useSubmitSlideResponse(gameId);

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
      // Fill in player info
      const fullResponse: SlideResponse = {
        ...response,
        playerId,
        playerName,
      };

      // Persist to Firestore
      if (gameId) {
        await submitResponse(fullResponse);
      }

      // Call optional external handler
      if (onSubmit) {
        await onSubmit(fullResponse);
      }

      // Notify state machine that response was submitted
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }
    },
    [playerId, playerName, gameId, submitResponse, onSubmit, onResponseSubmitted]
  );

  const props: SlidePlayerProps = {
    slide,
    presentation: stubPresentation,
    game: stubGame,
    playerId,
    playerName,
    hasResponded: hasResponded || isSubmitting,
    onSubmit: handleSubmit,
    slideIndex,
  };

  // Show loading state while checking if player has already responded
  if (responseLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <PlayerComponent key={slide.id} {...props} />
    </AnimatePresence>
  );
}
