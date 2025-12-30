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
import { QuizEditor, QuizHost, QuizPlayer } from './quiz';

// Poll slide type
import { PollEditor, PollHost, PollPlayer } from './poll';

// Thoughts slide types
import {
  ThoughtsCollectEditor,
  ThoughtsCollectHost,
  ThoughtsCollectPlayer,
  ThoughtsResultsEditor,
  ThoughtsResultsHost,
  ThoughtsResultsPlayer,
} from './thoughts';

// Rating slide types
import {
  RatingDescribeEditor,
  RatingDescribeHost,
  RatingDescribePlayer,
  RatingInputEditor,
  RatingInputHost,
  RatingInputPlayer,
  RatingResultsEditor,
  RatingResultsHost,
  RatingResultsPlayer,
  RatingSummaryEditor,
  RatingSummaryHost,
  RatingSummaryPlayer,
} from './rating';

// Leaderboard slide type
import {
  LeaderboardEditor,
  LeaderboardHost,
  LeaderboardPlayer,
} from './leaderboard';

// Quiz Results slide type
import {
  QuizResultsEditor,
  QuizResultsHost,
  QuizResultsPlayer,
} from './quiz-results';

// Poll Results slide type
import {
  PollResultsEditor,
  PollResultsHost,
  PollResultsPlayer,
} from './poll-results';

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

  'quiz-results': {
    type: 'quiz-results',
    label: 'Quiz Results',
    description: 'Show results from quiz slides (requires quiz slides)',
    icon: 'CheckCircle',
    EditorComponent: QuizResultsEditor,
    HostComponent: QuizResultsHost,
    PlayerComponent: QuizResultsPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'quiz-results',
      order,
      sourceSlideIds: [],
      resultsTitle: 'Quiz Results',
      resultsDisplayMode: 'individual',
    }),
  },

  'poll-results': {
    type: 'poll-results',
    label: 'Poll Results',
    description: 'Show results from poll slides (requires poll slides)',
    icon: 'PieChart',
    EditorComponent: PollResultsEditor,
    HostComponent: PollResultsHost,
    PlayerComponent: PollResultsPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'poll-results',
      order,
      sourceSlideIds: [],
      resultsTitle: 'Poll Results',
      resultsDisplayMode: 'individual',
    }),
  },

  'thoughts-collect': {
    type: 'thoughts-collect',
    label: 'Thoughts Gathering',
    description: 'Collect ideas (creates collect and results slides)',
    icon: 'MessageSquare',
    EditorComponent: ThoughtsCollectEditor,
    HostComponent: ThoughtsCollectHost,
    PlayerComponent: ThoughtsCollectPlayer,
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
    EditorComponent: ThoughtsResultsEditor,
    HostComponent: ThoughtsResultsHost,
    PlayerComponent: ThoughtsResultsPlayer,
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
    description: 'Rate an item (creates describe, input, and results slides)',
    icon: 'Star',
    EditorComponent: RatingDescribeEditor,
    HostComponent: RatingDescribeHost,
    PlayerComponent: RatingDescribePlayer,
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
        sourceDescribeSlideId: `${baseId}-describe`,
        ratingMetric: {
          type: 'stars',
          min: 1,
          max: 5,
          question: 'How would you rate this?',
        },
      },
      {
        id: `${baseId}-results`,
        type: 'rating-results' as PresentationSlideType,
        order: startOrder + 2,
        sourceSlideId: `${baseId}-input`,
        ratingResultsMode: 'single',
      },
    ],
  },

  'rating-input': {
    type: 'rating-input',
    label: 'Rating Input',
    description: 'Participants submit their rating',
    icon: 'Star',
    EditorComponent: RatingInputEditor,
    HostComponent: RatingInputHost,
    PlayerComponent: RatingInputPlayer,
    isInteractive: true,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-input',
      order,
      sourceDescribeSlideId: '',
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
    EditorComponent: RatingResultsEditor,
    HostComponent: RatingResultsHost,
    PlayerComponent: RatingResultsPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-results',
      order,
      sourceSlideId: '',
    }),
  },

  'rating-summary': {
    type: 'rating-summary',
    label: 'Rating Summary',
    description: 'Comprehensive summary with charts and heatmap',
    icon: 'LayoutGrid',
    EditorComponent: RatingSummaryEditor,
    HostComponent: RatingSummaryHost,
    PlayerComponent: RatingSummaryPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'rating-summary',
      order,
      summaryTitle: 'Rating Summary',
      summaryDefaultView: 'ranking',
    }),
  },

  'leaderboard': {
    type: 'leaderboard',
    label: 'Leaderboard',
    description: 'Show player rankings and scores',
    icon: 'Trophy',
    EditorComponent: LeaderboardEditor,
    HostComponent: LeaderboardHost,
    PlayerComponent: LeaderboardPlayer,
    isInteractive: false,
    createDefaultSlide: (id, order) => ({
      id,
      type: 'leaderboard',
      order,
      leaderboardMode: 'standard',
      leaderboardMaxDisplay: 10,
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
