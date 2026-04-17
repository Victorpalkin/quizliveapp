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
import { HostEvaluationElement } from './elements/HostEvaluationElement';
import { HostEvaluationResultsElement } from './elements/HostEvaluationResultsElement';
import { HostAgenticDesignerElement } from './elements/HostAgenticDesignerElement';
import { HostAgenticDesignerResultsElement } from './elements/HostAgenticDesignerResultsElement';
import { HostLeaderboardElement } from './elements/HostLeaderboardElement';
import { HostQAElement } from './elements/HostQAElement';
import { HostSpinWheelElement } from './elements/HostSpinWheelElement';
import { HostConnectorElement } from './elements/HostConnectorElement';
import type { PresentationSlide } from '@/lib/types';

// Light-mode theme values (from :root in globals.css) — used on light slide backgrounds
const LIGHT_BG_VARS: Record<string, string> = {
  '--foreground': '0 0% 9%',
  '--background': '0 0% 100%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 45%',
  '--border': '0 0% 93%',
  '--card-foreground': '0 0% 9%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 9%',
  '--input': '0 0% 90%',
};

// Dark-mode theme values (from .dark in globals.css) — used on dark slide backgrounds
const DARK_BG_VARS: Record<string, string> = {
  '--foreground': '0 0% 98%',
  '--background': '222 47% 11%',
  '--muted': '217 33% 21%',
  '--muted-foreground': '0 0% 65%',
  '--border': '217 33% 25%',
  '--card-foreground': '0 0% 98%',
  '--secondary': '217 33% 21%',
  '--secondary-foreground': '0 0% 98%',
  '--input': '217 33% 21%',
};

/** Parse a hex color (#rgb or #rrggbb) to [r, g, b] in 0–1 range */
function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/** Compute WCAG relative luminance from linear RGB values */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Determine the luminance of a slide background (0 = black, 1 = white) */
function getBackgroundLuminance(background?: PresentationSlide['background']): number {
  if (!background) return 1; // default white

  if (background.type === 'solid' && background.color) {
    const [r, g, b] = hexToRgb(background.color);
    return relativeLuminance(r, g, b);
  }

  if (background.type === 'gradient' && background.gradient) {
    // Extract the first hex color from the gradient string
    const hexMatch = background.gradient.match(/#[0-9a-fA-F]{3,6}/);
    if (hexMatch) {
      const [r, g, b] = hexToRgb(hexMatch[0]);
      return relativeLuminance(r, g, b);
    }
  }

  // Image backgrounds — assume light (most common)
  return 1;
}

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

  // Pick light or dark theme overrides based on slide background luminance
  const themeVars = getBackgroundLuminance(slide.background) < 0.5 ? DARK_BG_VARS : LIGHT_BG_VARS;

  // Sort elements by zIndex for proper layering
  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="relative w-full h-full" style={{ ...bgStyle, ...themeVars } as React.CSSProperties}>
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
          {element.type === 'connector' && <HostConnectorElement element={element} />}
          {element.type === 'quiz' && <HostQuizElement element={element} gameId={gameId} playerCount={playerCount} timerStartedAt={timerElementId === element.id ? timerStartedAt : null} />}
          {element.type === 'poll' && <HostPollElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'thoughts' && <HostThoughtsElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'rating' && <HostRatingElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'evaluation' && <HostEvaluationElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'agentic-designer' && <HostAgenticDesignerElement element={element} gameId={gameId} playerCount={playerCount} />}
          {element.type === 'quiz-results' && <HostQuizResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'poll-results' && <HostPollResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'thoughts-results' && <HostThoughtsResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'rating-results' && <HostRatingResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'evaluation-results' && <HostEvaluationResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'agentic-designer-results' && <HostAgenticDesignerResultsElement element={element} slides={slides} gameId={gameId} />}
          {element.type === 'leaderboard' && <HostLeaderboardElement element={element} gameId={gameId} />}
          {element.type === 'qa' && <HostQAElement element={element} gameId={gameId} />}
          {element.type === 'spin-wheel' && <HostSpinWheelElement element={element} playerNames={playerNames} />}
        </motion.div>
      ))}
    </div>
  );
}
