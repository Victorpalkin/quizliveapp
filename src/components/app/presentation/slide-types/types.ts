/**
 * Shared types for presentation slide type components
 */

import { PresentationSlide, PresentationSlideType, Presentation, PresentationGame } from '@/lib/types';

/**
 * Props for slide editor components
 */
export interface SlideEditorProps {
  slide: PresentationSlide;
  presentation: Presentation;
  onSlideChange: (updatedSlide: PresentationSlide) => void;
  isSelected: boolean;
}

/**
 * Props for host slide renderer components
 */
export interface SlideHostProps {
  slide: PresentationSlide;
  presentation: Presentation;
  game: PresentationGame;
  slideIndex: number;
  totalSlides: number;
  playerCount: number;
  responseCount: number;
  onNext: () => void;
  onPrevious: () => void;
  isFirstSlide: boolean;
  isLastSlide: boolean;
}

/**
 * Props for player slide renderer components
 */
export interface SlidePlayerProps {
  slide: PresentationSlide;
  presentation: Presentation;
  game: PresentationGame;
  playerId: string;
  playerName: string;
  hasResponded: boolean;
  onSubmit: (response: SlideResponse) => Promise<void>;
  slideIndex: number; // Used for submitAnswer questionIndex mapping
}

/**
 * Props for results visualization components
 */
export interface SlideResultsProps {
  slide: PresentationSlide;
  presentation: Presentation;
  game: PresentationGame;
  responses: SlideResponse[];
  playerCount: number;
}

/**
 * Generic slide response type
 */
export interface SlideResponse {
  slideId: string;
  playerId: string;
  playerName: string;

  // For quiz/poll slides
  answerIndex?: number;
  answerIndices?: number[];

  // For thoughts-collect slides
  thoughts?: string[];

  // For rating-input slides
  rating?: number;
}

/**
 * Definition for a slide type plugin
 */
export interface SlideTypeDefinition {
  type: PresentationSlideType;
  label: string;
  description: string;
  icon: string;  // Lucide icon name

  // Components for this slide type
  EditorComponent: React.ComponentType<SlideEditorProps>;
  HostComponent: React.ComponentType<SlideHostProps>;
  PlayerComponent: React.ComponentType<SlidePlayerProps>;
  ResultsComponent?: React.ComponentType<SlideResultsProps>;

  // If true, adding this slide type creates multiple slides (e.g., thoughts-collect + thoughts-results)
  createsMultipleSlides?: boolean;

  // Creates the default slide data for this type
  createDefaultSlide: (id: string, order: number) => PresentationSlide;

  // For types that create multiple slides, returns all slides to create
  createSlideSet?: (baseId: string, startOrder: number) => PresentationSlide[];

  // Whether this slide type requires player interaction
  isInteractive: boolean;
}
