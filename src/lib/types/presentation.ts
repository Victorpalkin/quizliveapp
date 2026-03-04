import { Timestamp } from 'firebase/firestore';

// ==========================================
// Presentation Mode Types (Canvas-based WYSIWYG)
// ==========================================

/**
 * Element types that can be placed on a slide canvas.
 * Content elements: text, image, shape
 * Interactive elements (max 1 per slide): quiz, poll, thoughts, rating
 * Results elements: quiz-results, poll-results, thoughts-results, rating-results
 * Special elements: leaderboard, qa, spin-wheel
 */
export type SlideElementType =
  // Content
  | 'text'
  | 'image'
  | 'shape'
  // Interactive (max 1 per slide, player interacts with these)
  | 'quiz'
  | 'poll'
  | 'thoughts'
  | 'rating'
  // Results (display-only, reference a source element)
  | 'quiz-results'
  | 'poll-results'
  | 'thoughts-results'
  | 'rating-results'
  // Special elements
  | 'leaderboard'
  | 'qa'
  | 'spin-wheel';

/** Which element types are interactive (player submits a response) */
export const INTERACTIVE_ELEMENT_TYPES: SlideElementType[] = ['quiz', 'poll', 'thoughts', 'rating'];

/**
 * Canvas element positioned on a slide.
 * All coordinates are percentages of slide dimensions for responsive rendering.
 */
export interface SlideElement {
  id: string;
  type: SlideElementType;
  x: number;      // % of slide width (0-100)
  y: number;      // % of slide height (0-100)
  width: number;  // % of slide width
  height: number; // % of slide height
  rotation?: number;
  zIndex: number;
  opacity?: number;
  locked?: boolean;

  // === Text properties ===
  content?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  lineHeight?: number;

  // === Image properties ===
  imageUrl?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;

  // === Shape properties ===
  shapeType?: 'rectangle' | 'circle' | 'rounded-rect' | 'line';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;

  // === Interactive element configs ===
  quizConfig?: {
    question: string;
    answers: { text: string }[];
    correctAnswerIndex: number;
    timeLimit: number;
    pointValue: number;
  };

  pollConfig?: {
    question: string;
    options: { text: string }[];
    allowMultiple: boolean;
  };

  thoughtsConfig?: {
    prompt: string;
    maxPerPlayer: number;
    timeLimit?: number;
  };

  ratingConfig?: {
    itemTitle: string;
    itemDescription?: string;
    itemImageUrl?: string;
    metricType: 'stars' | 'slider' | 'emoji';
    min: number;
    max: number;
    question?: string;
  };

  qaConfig?: {
    topic?: string;
    moderationEnabled: boolean;
  };

  spinWheelConfig?: {
    mode: 'players' | 'custom';
    segments?: { label: string; color?: string }[];
    action?: string;
  };

  leaderboardConfig?: {
    maxDisplay: number;
    showScores: boolean;
  };

  // Results elements - reference source
  sourceElementId?: string;
  sourceSlideId?: string;
}

/** Slide background configuration */
export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradient?: string;
  imageUrl?: string;
}

/** A single slide in the presentation (canvas-based) */
export interface PresentationSlide {
  id: string;
  order: number;
  elements: SlideElement[];
  background?: SlideBackground;
  notes?: string;
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
}

/** Presentation settings */
export interface PresentationSettings {
  enableReactions: boolean;
  enableQA: boolean;
  enableStreaks: boolean;
  enableSoundEffects: boolean;
  defaultTimerSeconds: number;
  pacingMode: 'free' | 'threshold' | 'all';
  pacingThreshold: number;
}

/** Visual theme */
export interface PresentationTheme {
  preset: 'default' | 'vibrant' | 'elegant' | 'dark' | 'playful' | 'custom';
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

/** Presentation document stored in /presentations/{presentationId} */
export interface Presentation {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  slides: PresentationSlide[];
  settings: PresentationSettings;
  theme: PresentationTheme;
  createdAt: Date;
  updatedAt: Date;
}

/** Presentation game states */
export type PresentationGameState = 'lobby' | 'active' | 'paused' | 'ended';

/** Game session for a live presentation */
export interface PresentationGame {
  id: string;
  hostId: string;
  gamePin: string;
  activityType: 'presentation';
  presentationId: string;
  state: PresentationGameState;
  currentSlideIndex: number;
  settings: PresentationSettings;
  createdAt: Date;
  timerStartedAt?: Date;    // Server timestamp when quiz timer started
  timerElementId?: string;  // Which quiz element the timer is for
}

/** Player response for a presentation element */
export interface PresentationElementResponse {
  id: string;
  elementId: string;
  slideId: string;
  playerId: string;
  playerName: string;
  submittedAt: Timestamp;
  timeRemaining?: number;

  // Answer data (type-specific)
  answerIndex?: number;
  answerIndices?: number[];
  textAnswers?: string[];
  ratingValue?: number;
}

/** Live reaction from a player */
export interface PresentationReaction {
  id: string;
  playerId: string;
  emoji: string;
  timestamp: Timestamp;
}

/** Q&A question from a player */
export interface PresentationQuestion {
  id: string;
  text: string;
  playerId: string;
  playerName: string;
  upvotes: number;
  upvotedBy: string[];
  answered: boolean;
  pinned: boolean;
  createdAt: Timestamp;
}

/** Template category for organization */
export type PresentationTemplateCategory =
  | 'workshop'
  | 'training'
  | 'feedback'
  | 'meeting'
  | 'custom';

/** Presentation template for quick starts */
export interface PresentationTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  category: PresentationTemplateCategory;
  thumbnail?: string;
  slides: PresentationSlide[];
  settings: PresentationSettings;
  theme: PresentationTheme;
  isBuiltIn: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
