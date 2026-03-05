import { nanoid } from 'nanoid';
import type { PresentationSlide, SlideElement } from '@/lib/types';

/**
 * Types matching the AI-generated presentation structure from the Cloud Function.
 */

interface GeneratedPresentationStyle {
  imageStyle?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  fontStyle?: string;
  layoutHints?: string;
}

interface GeneratedSlideQuestion {
  type: string;
  text: string;
  timeLimit?: number;
  answers?: { text: string }[];
  correctAnswerIndex?: number;
}

interface GeneratedPollQuestion {
  type: string;
  text: string;
  answers?: { text: string }[];
  timeLimit?: number;
}

interface GeneratedRatingItem {
  title: string;
  description?: string;
}

interface GeneratedRatingMetric {
  type: 'stars' | 'numeric' | 'labels';
  min: number;
  max: number;
  question?: string;
}

export interface GeneratedPresentationSlide {
  id?: string;
  type: string;
  order?: number;
  title?: string;
  description?: string;
  question?: GeneratedSlideQuestion;
  pollQuestion?: GeneratedPollQuestion;
  thoughtsPrompt?: string;
  thoughtsMaxPerPlayer?: number;
  sourceSlideId?: string;
  sourceSlideIds?: string[];
  sourceDescribeSlideId?: string;
  ratingItem?: GeneratedRatingItem;
  ratingMetric?: GeneratedRatingMetric;
  resultsTitle?: string;
  resultsDisplayMode?: string;
  leaderboardMode?: string;
  leaderboardMaxDisplay?: number;
  imagePrompt?: string;
}

export interface GeneratedPresentation {
  title: string;
  description?: string;
  slides: GeneratedPresentationSlide[];
  style?: GeneratedPresentationStyle;
}

interface ConvertedPresentation {
  title: string;
  description: string;
  slides: PresentationSlide[];
}

/** Map of AI slide ID → { frontendSlideId, interactiveElementId } for results linking */
interface SlideIdMapping {
  frontendSlideId: string;
  interactiveElementId: string;
}

/**
 * Converts an AI-generated presentation to the frontend PresentationSlide[] format.
 *
 * Uses a two-pass approach:
 * 1. First pass: convert all slides and build an AI-ID → frontend-ID map
 * 2. Second pass: resolve sourceSlideId/sourceElementId references on results elements
 */
export function convertAIPresentation(generated: GeneratedPresentation): ConvertedPresentation {
  const idMap = new Map<string, SlideIdMapping>();
  const slides: PresentationSlide[] = [];

  // First pass: convert each slide
  for (let i = 0; i < generated.slides.length; i++) {
    const aiSlide = generated.slides[i];
    const slideId = nanoid();
    const slide: PresentationSlide = {
      id: slideId,
      order: i,
      elements: [],
      background: { type: 'solid', color: '#ffffff' },
      transition: 'fade',
    };

    // Store imagePrompt in notes for manual image generation later
    if (aiSlide.imagePrompt) {
      slide.notes = aiSlide.imagePrompt;
    }

    const elements = convertSlideElements(aiSlide, slideId);
    slide.elements = elements;

    // Register the AI slide ID in the map (for results linking)
    if (aiSlide.id) {
      const interactiveEl = elements.find(
        (el) => ['quiz', 'poll', 'thoughts', 'rating'].includes(el.type)
      );
      idMap.set(aiSlide.id, {
        frontendSlideId: slideId,
        interactiveElementId: interactiveEl?.id || elements[0]?.id || '',
      });
    }

    slides.push(slide);
  }

  // Second pass: resolve results references
  for (const slide of slides) {
    for (const element of slide.elements) {
      if (element.sourceSlideId && idMap.has(element.sourceSlideId)) {
        const mapping = idMap.get(element.sourceSlideId)!;
        element.sourceSlideId = mapping.frontendSlideId;
        element.sourceElementId = mapping.interactiveElementId;
      }
    }
  }

  return {
    title: generated.title,
    description: generated.description || '',
    slides,
  };
}

function convertSlideElements(aiSlide: GeneratedPresentationSlide, slideId: string): SlideElement[] {
  switch (aiSlide.type) {
    case 'content':
      return convertContentSlide(aiSlide);
    case 'quiz':
      return convertQuizSlide(aiSlide);
    case 'poll':
      return convertPollSlide(aiSlide);
    case 'thoughts-collect':
      return convertThoughtsCollectSlide(aiSlide);
    case 'thoughts-results':
      return convertThoughtsResultsSlide(aiSlide);
    case 'rating-describe':
      return convertRatingDescribeSlide(aiSlide);
    case 'rating-input':
      return convertRatingInputSlide(aiSlide);
    case 'rating-results':
      return convertRatingResultsSlide(aiSlide);
    case 'quiz-results':
      return convertQuizResultsSlide(aiSlide);
    case 'poll-results':
      return convertPollResultsSlide(aiSlide);
    case 'leaderboard':
      return convertLeaderboardSlide(aiSlide);
    default:
      return convertContentSlide(aiSlide);
  }
}

function convertContentSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  const elements: SlideElement[] = [];

  if (aiSlide.title) {
    elements.push({
      id: nanoid(),
      type: 'text',
      x: 10,
      y: 10,
      width: 80,
      height: 15,
      zIndex: 1,
      content: aiSlide.title,
      fontSize: 48,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#000000',
    });
  }

  if (aiSlide.description) {
    elements.push({
      id: nanoid(),
      type: 'text',
      x: 10,
      y: 30,
      width: 80,
      height: 50,
      zIndex: 2,
      content: aiSlide.description,
      fontSize: 24,
      textAlign: 'center',
      color: '#000000',
    });
  }

  return elements;
}

function convertQuizSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  const q = aiSlide.question;
  if (!q) return convertContentSlide(aiSlide);

  return [{
    id: nanoid(),
    type: 'quiz',
    x: 10,
    y: 20,
    width: 80,
    height: 60,
    zIndex: 1,
    quizConfig: {
      question: q.text,
      answers: q.answers || [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }],
      correctAnswerIndex: q.correctAnswerIndex ?? 0,
      timeLimit: q.timeLimit || 20,
      pointValue: 1000,
    },
  }];
}

function convertPollSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  // The backend maps pollQuestion → question, so check both
  const q = aiSlide.pollQuestion || aiSlide.question;
  if (!q) return convertContentSlide(aiSlide);

  return [{
    id: nanoid(),
    type: 'poll',
    x: 10,
    y: 20,
    width: 80,
    height: 60,
    zIndex: 1,
    pollConfig: {
      question: q.text,
      options: q.answers || [{ text: 'Option A' }, { text: 'Option B' }],
      allowMultiple: q.type === 'poll-multiple',
    },
  }];
}

function convertThoughtsCollectSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  return [{
    id: nanoid(),
    type: 'thoughts',
    x: 10,
    y: 20,
    width: 80,
    height: 60,
    zIndex: 1,
    thoughtsConfig: {
      prompt: aiSlide.thoughtsPrompt || 'Share your thoughts...',
      maxPerPlayer: aiSlide.thoughtsMaxPerPlayer || 3,
    },
  }];
}

function convertThoughtsResultsSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  return [{
    id: nanoid(),
    type: 'thoughts-results',
    x: 10,
    y: 10,
    width: 80,
    height: 70,
    zIndex: 1,
    // Will be resolved in the second pass
    sourceSlideId: aiSlide.sourceSlideId || '',
    sourceElementId: '',
  }];
}

function convertRatingDescribeSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  const elements: SlideElement[] = [];
  const item = aiSlide.ratingItem;

  elements.push({
    id: nanoid(),
    type: 'text',
    x: 10,
    y: 10,
    width: 80,
    height: 15,
    zIndex: 1,
    content: item?.title || aiSlide.title || 'Rate this item',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
  });

  if (item?.description || aiSlide.description) {
    elements.push({
      id: nanoid(),
      type: 'text',
      x: 10,
      y: 30,
      width: 80,
      height: 50,
      zIndex: 2,
      content: item?.description || aiSlide.description || '',
      fontSize: 24,
      textAlign: 'center',
      color: '#000000',
    });
  }

  return elements;
}

function convertRatingInputSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  const metric = aiSlide.ratingMetric;
  return [{
    id: nanoid(),
    type: 'rating',
    x: 10,
    y: 20,
    width: 80,
    height: 60,
    zIndex: 1,
    ratingConfig: {
      itemTitle: metric?.question || 'Rate this item',
      metricType: (metric?.type === 'stars' ? 'stars' : metric?.type === 'numeric' ? 'slider' : 'stars') as 'stars' | 'slider' | 'emoji',
      min: metric?.min ?? 1,
      max: metric?.max ?? 5,
    },
  }];
}

function convertRatingResultsSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  return [{
    id: nanoid(),
    type: 'rating-results',
    x: 10,
    y: 10,
    width: 80,
    height: 70,
    zIndex: 1,
    // Will be resolved in the second pass
    sourceSlideId: aiSlide.sourceSlideId || '',
    sourceElementId: '',
  }];
}

function convertQuizResultsSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  // Quiz-results may reference multiple source slides; use the first one for the element link
  const sourceId = aiSlide.sourceSlideIds?.[0] || aiSlide.sourceSlideId || '';
  return [{
    id: nanoid(),
    type: 'quiz-results',
    x: 10,
    y: 10,
    width: 80,
    height: 70,
    zIndex: 1,
    sourceSlideId: sourceId,
    sourceElementId: '',
  }];
}

function convertPollResultsSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  const sourceId = aiSlide.sourceSlideIds?.[0] || aiSlide.sourceSlideId || '';
  return [{
    id: nanoid(),
    type: 'poll-results',
    x: 10,
    y: 10,
    width: 80,
    height: 70,
    zIndex: 1,
    sourceSlideId: sourceId,
    sourceElementId: '',
  }];
}

function convertLeaderboardSlide(aiSlide: GeneratedPresentationSlide): SlideElement[] {
  return [{
    id: nanoid(),
    type: 'leaderboard',
    x: 10,
    y: 5,
    width: 80,
    height: 90,
    zIndex: 1,
    leaderboardConfig: {
      maxDisplay: aiSlide.leaderboardMaxDisplay || 10,
      showScores: true,
    },
  }];
}
