'use client';

import { useRouter } from 'next/navigation';
import { usePresentationById } from '@/firebase/presentation/use-presentation';
import { usePresentationControls } from '@/firebase/presentation/use-presentation-game';
import { HostSlideCanvas } from './HostSlideCanvas';
import { HostOverlay } from './HostOverlay';
import { HostControls } from './HostControls';
import { ReactionOverlay } from './ReactionOverlay';
import type { PresentationGame } from '@/lib/types';

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  maxStreak: number;
  joinedAt: Date;
}

interface PresentationHostProps {
  game: PresentationGame;
  players: Player[];
}

export function PresentationHost({ game, players }: PresentationHostProps) {
  const router = useRouter();
  const { presentation, loading } = usePresentationById(game.presentationId);
  const controls = usePresentationControls(game.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Loading presentation...
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Presentation not found
      </div>
    );
  }

  const currentSlide = presentation.slides[game.currentSlideIndex];
  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        Invalid slide index
      </div>
    );
  }

  const playerNames = players.map((p) => p.name);

  const handleEnd = () => {
    controls.endPresentation();
    router.push('/host');
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 16:9 canvas centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw]">
          <HostSlideCanvas
            slide={currentSlide}
            slides={presentation.slides}
            gameId={game.id}
            playerCount={players.length}
            playerNames={playerNames}
          />

          {/* Overlay: PIN, slide counter, player count */}
          <HostOverlay
            gamePin={game.gamePin}
            slideIndex={game.currentSlideIndex}
            totalSlides={presentation.slides.length}
            playerCount={players.length}
          />

          {/* Reactions floating up */}
          {game.settings.enableReactions && (
            <ReactionOverlay gameId={game.id} />
          )}

          {/* Navigation controls (show on hover) */}
          <HostControls
            slideIndex={game.currentSlideIndex}
            totalSlides={presentation.slides.length}
            gameState={game.state}
            onNextSlide={() => controls.nextSlide(game.currentSlideIndex, presentation.slides.length)}
            onPrevSlide={() => controls.prevSlide(game.currentSlideIndex)}
            onPause={controls.pausePresentation}
            onResume={controls.startPresentation}
            onEnd={handleEnd}
          />
        </div>
      </div>
    </div>
  );
}
