import { HttpsError } from 'firebase-functions/v2/https';
import { createAIHandler, buildGeminiContents } from '../utils/createAIHandler';
import { stripMarkdownCodeBlocks } from '../utils/stripMarkdownCodeBlocks';
import type {
  GeneratePresentationRequest,
  GeneratePresentationResponse,
  GeneratedPresentationSlide,
} from '../types';
import { randomUUID } from 'crypto';
import { PRESENTATION_SYSTEM_PROMPT } from '../prompts/presentationPrompt';

/**
 * Links results slides to their source slides by resolving temporary IDs
 */
function linkResultsSlides(slides: GeneratedPresentationSlide[]): void {
  const tempIdMap = new Map<string, string>();
  let quizCount = 0;
  let pollCount = 0;

  // First pass: assign IDs and build temp ID map
  slides.forEach((slide, index) => {
    if (!slide.id) {
      slide.id = randomUUID();
    }
    slide.order = index;

    if (slide.type === 'thoughts-collect') {
      tempIdMap.set(`thoughts-${index + 1}`, slide.id);
    } else if (slide.type === 'rating-describe') {
      tempIdMap.set(`rating-desc-${index + 1}`, slide.id);
    } else if (slide.type === 'rating-input') {
      tempIdMap.set(`rating-input-${index + 1}`, slide.id);
    } else if (slide.type === 'quiz') {
      quizCount++;
      tempIdMap.set(`quiz-${quizCount}`, slide.id);
    } else if (slide.type === 'poll') {
      pollCount++;
      tempIdMap.set(`poll-${pollCount}`, slide.id);
    }
  });

  // Second pass: resolve references
  slides.forEach((slide) => {
    if (slide.sourceSlideId && tempIdMap.has(slide.sourceSlideId)) {
      slide.sourceSlideId = tempIdMap.get(slide.sourceSlideId)!;
    }
    if (slide.sourceDescribeSlideId && tempIdMap.has(slide.sourceDescribeSlideId)) {
      slide.sourceDescribeSlideId = tempIdMap.get(slide.sourceDescribeSlideId)!;
    }
    if (slide.sourceSlideIds && Array.isArray(slide.sourceSlideIds)) {
      slide.sourceSlideIds = slide.sourceSlideIds.map(id =>
        tempIdMap.has(id) ? tempIdMap.get(id)! : id
      );
    }
  });
}

/**
 * Validates a single slide's type-specific fields and sets defaults
 */
function validateSlide(slide: GeneratedPresentationSlide): void {
  if (!slide.type) {
    throw new Error('Slide missing type');
  }

  switch (slide.type) {
    case 'content':
      if (!slide.title && !slide.description) {
        throw new Error('Content slide must have title or description');
      }
      break;

    case 'quiz': {
      // Type assertion needed: AI output is untyped JSON, but GeneratedQuestion is a union
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = slide.question as any;
      if (!q?.text || !Array.isArray(q?.answers)) {
        throw new Error('Quiz slide must have question with text and answers');
      }
      if (typeof q.correctAnswerIndex !== 'number') {
        throw new Error('Quiz slide must have correctAnswerIndex');
      }
      if (!q.timeLimit) {
        q.timeLimit = 20;
      }
      break;
    }

    case 'poll':
      if (!slide.pollQuestion?.text || !Array.isArray(slide.pollQuestion?.answers)) {
        throw new Error('Poll slide must have pollQuestion with text and answers');
      }
      if (!slide.pollQuestion.timeLimit) {
        slide.pollQuestion.timeLimit = 30;
      }
      // Map pollQuestion to question for frontend compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (slide as any).question = slide.pollQuestion;
      break;

    case 'thoughts-collect':
      if (!slide.thoughtsPrompt) {
        throw new Error('Thoughts-collect slide must have thoughtsPrompt');
      }
      if (!slide.thoughtsMaxPerPlayer) {
        slide.thoughtsMaxPerPlayer = 3;
      }
      break;

    case 'thoughts-results':
      break;

    case 'rating-describe':
      if (!slide.ratingItem?.title) {
        throw new Error('Rating-describe slide must have ratingItem with title');
      }
      break;

    case 'rating-input':
      if (!slide.ratingMetric) {
        throw new Error('Rating-input slide must have ratingMetric');
      }
      if (!slide.ratingMetric.type) {
        slide.ratingMetric.type = 'stars';
      }
      if (slide.ratingMetric.min === undefined) {
        slide.ratingMetric.min = 1;
      }
      if (slide.ratingMetric.max === undefined) {
        slide.ratingMetric.max = 5;
      }
      break;

    case 'rating-results':
      if (!slide.ratingResultsMode) {
        slide.ratingResultsMode = 'single';
      }
      break;

    case 'rating-summary':
      if (!slide.summaryTitle) {
        slide.summaryTitle = 'Rating Summary';
      }
      if (!slide.summaryDefaultView) {
        slide.summaryDefaultView = 'ranking';
      }
      break;

    case 'leaderboard':
      if (!slide.leaderboardMode) {
        slide.leaderboardMode = 'standard';
      }
      if (!slide.leaderboardMaxDisplay) {
        slide.leaderboardMaxDisplay = 10;
      }
      break;

    case 'quiz-results':
      if (!slide.resultsTitle) {
        slide.resultsTitle = 'Quiz Results';
      }
      if (!slide.resultsDisplayMode) {
        slide.resultsDisplayMode = 'individual';
      }
      if (!slide.sourceSlideIds) {
        slide.sourceSlideIds = [];
      }
      break;

    case 'poll-results':
      if (!slide.resultsTitle) {
        slide.resultsTitle = 'Poll Results';
      }
      if (!slide.resultsDisplayMode) {
        slide.resultsDisplayMode = 'individual';
      }
      if (!slide.sourceSlideIds) {
        slide.sourceSlideIds = [];
      }
      break;
  }
}

/**
 * Parses and validates the Gemini response for presentation generation
 */
function parsePresentationResponse(responseText: string): GeneratePresentationResponse {
  const jsonStr = stripMarkdownCodeBlocks(responseText);

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.presentation || !parsed.presentation.title || !Array.isArray(parsed.presentation.slides)) {
      throw new Error('Invalid presentation structure');
    }

    for (const slide of parsed.presentation.slides) {
      validateSlide(slide);
    }

    linkResultsSlides(parsed.presentation.slides);

    if (!parsed.presentation.style) {
      parsed.presentation.style = {
        imageStyle: 'Modern flat illustration with clean lines and vibrant colors',
      };
    }

    return {
      presentation: parsed.presentation,
      message: parsed.message || 'Presentation generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse presentation response:', responseText);
    throw new HttpsError('internal', 'Failed to parse AI response. Please try again.');
  }
}

/**
 * Cloud Function to generate presentation slides using Gemini
 */
export const generatePresentationWithAI = createAIHandler<GeneratePresentationRequest, GeneratePresentationResponse>({
  systemPrompt: PRESENTATION_SYSTEM_PROMPT,
  activityType: 'presentation',
  validateRequest: (data) => {
    if (data.attachedContent && typeof data.attachedContent === 'string' && data.attachedContent.length > 50000) {
      throw new HttpsError(
        'invalid-argument',
        'Attached content must be less than 50,000 characters'
      );
    }
  },
  buildContents: (data) => buildGeminiContents(
    data.prompt,
    data.conversationHistory,
    data.currentPresentation ? { label: 'presentation', data: data.currentPresentation } : undefined,
    data.attachedContent
  ),
  parseResponse: parsePresentationResponse,
  getSuccessLog: (uid, result) =>
    `Presentation generated for user ${uid}: ${result.presentation.title} with ${result.presentation.slides.length} slides`,
});
