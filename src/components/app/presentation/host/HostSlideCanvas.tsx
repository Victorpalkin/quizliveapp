'use client';

import { motion } from 'motion/react';
import { HostTextElement } from './elements/HostTextElement';
import { HostImageElement } from './elements/HostImageElement';
import { HostShapeElement } from './elements/HostShapeElement';
import { HostQuizElement } from './elements/HostQuizElement';
import { HostPollElement } from './elements/HostPollElement';
import { HostThoughtsElement } from './elements/HostThoughtsElement';
import { HostRatingElement } from './elements/HostRatingElement';
import { HostQuizResultsElement } from './elements/HostQuizResultsElement';
import { HostPollResultsElement } from './elements/HostPollResultsElement';
import { HostThoughtsResultsElement } from './elements/HostThoughtsResultsElement';
import { HostRatingResultsElement } from './elements/HostRatingResultsElement';
import { HostLeaderboardElement } from './elements/HostLeaderboardElement';
import { HostQAElement } from './elements/HostQAElement';
import { HostSpinWheelElement } from './elements/HostSpinWheelElement';
import type { PresentationSlide } from '@/lib/types';

interface HostSlideCanvasProps {
  slide: PresentationSlide;
  slides: PresentationSlide[];
  gameId: string;
  playerCount: number;
  playerNames: string[];
  timerStartedAt: Date | null;
  timerElementId: string | null;
}

export function HostSlideCanvas({ slide, slides, gameId, playerCount, playerNames, timerStartedAt, timerElementId }: HostSlideCanvasProps) {
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (slide.background.type === 'gradient' && slide.background.gradient) {
      bgStyle.background = slide.background.gradient;
    } else if (slide.background.type === 'image' && slide.background.imageUrl) {
      bgStyle.backgroundImage = `url(${slide.background.imageUrl})`;
      bgStyle.backgroundSize = 'cover';
      bgStyle.backgroundPosition = 'center';
    }
  } else {
    bgStyle.backgroundColor = '#ffffff';
  }

  // Sort elements by zIndex for proper layering
  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="relative w-full h-full" style={bgStyle}>
      {sortedElements.map((element, i) => (
        <motion.div
          key={element.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
          className="absolute"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            opacity: element.opacity ?? 1,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
            zIndex: element.zIndex,
          }}
        >
          {element.type === 'text' && <HostTextElement element={element} />}
          {element.type === 'image' && <HostImageElement element={element} />}
          {element.type === 'shape' && <HostShapeElement element={element} />}
          {element.type === 'quiz' && <HostQuizElement element={element} gameId={gameId} playerCount={playerCount} timerStartedAt={timerElementId === element.id ? timerStartedAt : null} />}
          {element.type === 'poll' && <HostPollElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'thoughts' && <HostThoughtsElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'rating' && <HostRatingElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'quiz-results' && <HostQuizResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'poll-results' && <HostPollResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'thoughts-results' && <HostThoughtsResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'rating-results' && <HostRatingResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'leaderboard' && <HostLeaderboardElement element={element} gameId={gameId} />}
          {element.type === 'qa' && <HostQAElement element={element} gameId={gameId} />}
          {element.type === 'spin-wheel' && <HostSpinWheelElement element={element} playerNames={playerNames} />}
        </motion.div>
      ))}
    </div>
  );
}
