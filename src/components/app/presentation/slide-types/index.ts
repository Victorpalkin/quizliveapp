/**
 * Slide Type Registry
 *
 * Central registry for all presentation slide types.
 * To add a new slide type:
 * 1. Create a folder with Editor, Host, Player, and optionally Results components
 * 2. Register it in SLIDE_TYPES below
 */

import { PresentationSlide, PresentationSlideType } from '@/lib/types';
import { SlideTypeDefinition, SlideEditorProps, SlideHostProps, SlidePlayerProps, SlideResultsProps } from './types';

// Content slide type
import { ContentEditor, ContentHost, ContentPlayer } from './content';

// Quiz slide type
import { QuizEditor, QuizHost, QuizPlayer, QuizResults } from './quiz';

// Poll slide type
import { PollEditor, PollHost, PollPlayer, PollResults } from './poll';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Registry of all slide types
 */
export const SLIDE_TYPES: Record<PresentationSlideType, SlideTypeDefinition> = {
  'content': {
    type: 'content',
    label: 'Content',
    description: 'Image or text slide (import from Google Slides or upload)',
    icon: 'Image',
    EditorComponent: ContentEditor,
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'content',
      order,
      title: '',
      description: '',
    }),
  },

  'quiz': {
    type: 'quiz',
    label: 'Quiz Question',
    description: 'Scored question with correct answer',
    icon: 'HelpCircle',
    EditorComponent: QuizEditor,
    HostComponent: QuizHost,
    PlayerComponent: QuizPlayer,
    ResultsComponent: QuizResults,
    isInteractive: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'quiz',
      order,
      question: {
        type: 'single-choice',
        text: '',
        answers: [
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' },
        ],
        correctAnswerIndex: 0,
        timeLimit: 20,
      },
    }),
  },

  'poll': {
    type: 'poll',
    label: 'Poll',
    description: 'Gather opinions (no scoring)',
    icon: 'BarChart3',
    EditorComponent: PollEditor,
    HostComponent: PollHost,
    PlayerComponent: PollPlayer,
    ResultsComponent: PollResults,
    isInteractive: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'poll',
      order,
      question: {
        type: 'poll-single',
        text: '',
        answers: [
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' },
        ],
        timeLimit: 30,
      },
    }),
  },

  'thoughts-collect': {
    type: 'thoughts-collect',
    label: 'Thoughts Gathering',
    description: 'Collect ideas from participants',
    icon: 'MessageSquare',
    // TODO: Create thoughts-collect components
    EditorComponent: ContentEditor, // Placeholder
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: true,
    createsMultipleSlides: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'thoughts-collect',
      order,
      thoughtsPrompt: '',
      thoughtsMaxPerPlayer: 3,
    }),
    createSlideSet: (baseId, startOrder) => [
      {
        id: `${baseId}-collect`,
        type: 'thoughts-collect' as PresentationSlideType,
        order: startOrder,
        thoughtsPrompt: '',
        thoughtsMaxPerPlayer: 3,
      },
      {
        id: `${baseId}-results`,
        type: 'thoughts-results' as PresentationSlideType,
        order: startOrder + 1,
        sourceSlideId: `${baseId}-collect`,
      },
    ],
  },

  'thoughts-results': {
    type: 'thoughts-results',
    label: 'Thoughts Results',
    description: 'Word cloud visualization',
    icon: 'Cloud',
    // TODO: Create thoughts-results components
    EditorComponent: ContentEditor, // Placeholder
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'thoughts-results',
      order,
      sourceSlideId: '',
    }),
  },

  'rating-describe': {
    type: 'rating-describe',
    label: 'Item Rating',
    description: 'Present an item for participants to rate',
    icon: 'Star',
    // TODO: Create rating-describe components
    EditorComponent: ContentEditor, // Placeholder
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: false,
    createsMultipleSlides: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-describe',
      order,
      ratingItem: {
        title: '',
        description: '',
      },
    }),
    createSlideSet: (baseId, startOrder) => [
      {
        id: `${baseId}-describe`,
        type: 'rating-describe' as PresentationSlideType,
        order: startOrder,
        ratingItem: {
          title: '',
          description: '',
        },
      },
      {
        id: `${baseId}-input`,
        type: 'rating-input' as PresentationSlideType,
        order: startOrder + 1,
        ratingInputSlideId: `${baseId}-describe`,
        ratingMetric: {
          type: 'stars',
          min: 1,
          max: 5,
          question: 'How would you rate this?',
        },
      },
    ],
  },

  'rating-input': {
    type: 'rating-input',
    label: 'Rating Input',
    description: 'Participants submit their rating',
    icon: 'Star',
    // TODO: Create rating-input components
    EditorComponent: ContentEditor, // Placeholder
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-input',
      order,
      ratingInputSlideId: '',
      ratingMetric: {
        type: 'stars',
        min: 1,
        max: 5,
      },
    }),
  },

  'rating-results': {
    type: 'rating-results',
    label: 'Rating Results',
    description: 'Aggregate rating visualization',
    icon: 'BarChart3',
    // TODO: Create rating-results components
    EditorComponent: ContentEditor, // Placeholder
    HostComponent: ContentHost,
    PlayerComponent: ContentPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-results',
      order,
      sourceSlideId: '',
    }),
  },
};

/**
 * Get slide type definition
 */
export function getSlideType(type: PresentationSlideType): SlideTypeDefinition {
  return SLIDE_TYPES[type];
}

/**
 * Get all slide types that can be added by user (excludes results types that are auto-created)
 */
export function getAddableSlideTypes(): SlideTypeDefinition[] {
  return Object.values(SLIDE_TYPES).filter(
    (def) => !['thoughts-results', 'rating-input', 'rating-results'].includes(def.type)
  );
}

/**
 * Create a new slide of the given type
 */
export function createSlide(type: PresentationSlideType, order: number): PresentationSlide | PresentationSlide[] {
  const definition = SLIDE_TYPES[type];
  const baseId = generateId();

  if (definition.createsMultipleSlides && definition.createSlideSet) {
    return definition.createSlideSet(baseId, order);
  }

  return definition.createDefaultSlide(baseId, order);
}

// Re-export types
export * from './types';
