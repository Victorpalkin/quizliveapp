import { Timestamp } from 'firebase/firestore';
import type { AgenticDesignerConfig, AgenticSourceRef } from './agentic-designer';

// ==========================================
// Presentation Mode Types (Canvas-based WYSIWYG)
// ==========================================

/**
 * Element types that can be placed on a slide canvas.
 * Content elements: text, image, shape
 * Interactive elements (max 1 per slide): quiz, poll, thoughts, rating, agentic-designer
 * Results elements: quiz-results, poll-results, thoughts-results, rating-results
 * Special elements: leaderboard, qa, spin-wheel
 */
export type SlideElementType =
  // Content
  | 'text'
  | 'image'
  | 'shape'
  | 'connector'
  // Interactive (max 1 per slide, player interacts with these)
  | 'quiz'
  | 'poll'
  | 'thoughts'
  | 'rating'
  | 'evaluation'
  | 'agentic-designer'
  | 'ai-step'
  // Results (display-only, reference a source element)
  | 'quiz-results'
  | 'poll-results'
  | 'thoughts-results'
  | 'rating-results'
  | 'evaluation-results'
  | 'agentic-designer-results'
  | 'ai-step-results'
  // Special elements
  | 'leaderboard'
  | 'qa'
  | 'spin-wheel';

/** Which element types are interactive (player submits a response) */
export const INTERACTIVE_ELEMENT_TYPES: SlideElementType[] = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation', 'agentic-designer', 'ai-step'];

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

  // === Text decoration ===
  textDecoration?: 'none' | 'underline';

  // === Shape properties ===
  shapeType?: 'rectangle' | 'circle' | 'rounded-rect' | 'line' | 'triangle' | 'arrow-right' | 'diamond';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;

  // === Connector properties ===
  connectorConfig?: {
    routingType: 'straight' | 'elbow' | 'curved';
    startX: number;  // % of slide
    startY: number;
    endX: number;
    endY: number;
    startAttachment?: {
      elementId: string;
      anchor: 'top' | 'bottom' | 'left' | 'right';
    };
    endAttachment?: {
      elementId: string;
      anchor: 'top' | 'bottom' | 'left' | 'right';
    };
    startArrow: 'none' | 'arrow';
    endArrow: 'none' | 'arrow';
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
  };

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
    items?: { id: string; text: string; description?: string }[];
  };

  qaConfig?: {
    topic?: string;
    moderationEnabled: boolean;
  };

  evaluationConfig?: {
    title: string;
    description?: string;
    items: { id: string; text: string; description?: string }[];
    metrics: {
      id: string;
      name: string;
      description?: string;
      scaleType: 'stars' | 'numeric' | 'labels';
      scaleMin: number;
      scaleMax: number;
      scaleLabels?: string[];
      weight: number;
      lowerIsBetter: boolean;
    }[];
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

  // === Agentic Designer config ===
  agenticDesignerConfig?: AgenticDesignerConfig;

  // === AI Step config (live AI generation per slide) ===
  aiStepConfig?: AIStepConfig;

  // === Evaluation source reference (dynamic items from agentic designer) ===
  agenticSourceRef?: AgenticSourceRef;

  // === Dynamic items source (items from ai-step structured output for evaluation/poll) ===
  dynamicItemsSource?: {
    sourceSlideId: string;
    sourceElementId: string;
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
  workflowConfig?: WorkflowConfig;
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
  ratingValues?: Record<string, number>; // itemId -> value (multi-item rating)
  evaluationRatings?: Record<string, Record<string, number>>; // itemId -> metricId -> value
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

// ==========================================
// AI Step Types (live AI generation per slide)
// ==========================================

/** Input field configuration for an AI step */
export interface AIStepFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox';
  placeholder?: string;
  helpText?: string;
  parentField?: string; // Conditional rendering (for checkbox groups)
}

/** Configuration for an ai-step element */
export interface AIStepConfig {
  stepPrompt: string;
  inputFields?: AIStepFieldConfig[];
  outputExpectation?: string;

  // Player/Audience Nudges
  enablePlayerNudges?: boolean; // default: true
  nudgeHints?: string[];

  // AI Capabilities
  enableGoogleSearch?: boolean;
  enableImageGeneration?: boolean;
  enableStructuredExtraction?: boolean;
  extractionHint?: string;
  enableAgentTracker?: boolean;

  // Context Selection — which previous ai-step slides to include as AI context
  contextSlideIds?: string[];
}

/** Workflow config shared across all ai-step slides in a presentation */
export interface WorkflowConfig {
  systemPrompt: string;
  target?: string;
}

/** Runtime workflow state stored at /games/{gameId}/workflowState */
export interface PresentationWorkflowState {
  slideOutputs: Record<string, SlideOutput>;
  isProcessing: boolean;
  processingSlideId?: string;
}

/** Output from a single ai-step slide */
export interface SlideOutput {
  aiOutput: string;
  structuredItems?: { id: string; name: string; description: string }[];
  imageUrl?: string;
  hostInputs?: Record<string, string | boolean>;
  generatedAt: number;
}

/** Player nudge for an ai-step slide, stored at /games/{gameId}/slideNudges/{slideId}/nudges/{nudgeId} */
export interface AIStepNudge {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  slideId: string;
  submittedAt: Timestamp;
}

/** Template category for organization */
export type PresentationTemplateCategory =
  | 'workshop'
  | 'training'
  | 'feedback'
  | 'meeting'
  | 'strategy'
  | 'brainstorming'
  | 'innovation'
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
  visibility: 'private' | 'public';
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
