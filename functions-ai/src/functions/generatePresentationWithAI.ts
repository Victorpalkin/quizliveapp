import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import { enforceRateLimitInMemory } from '../utils/rateLimit';
import {
  GeneratePresentationRequest,
  GeneratePresentationResponse,
  GeneratedPresentation,
  GeneratedPresentationSlide,
  ChatMessage,
} from '../types';
import { randomUUID } from 'crypto';

// System prompt that instructs Gemini how to generate presentations
const SYSTEM_PROMPT = `You are a presentation generation assistant for an interactive presentation platform called Zivo.

Your task is to generate presentation slides based on user prompts. You must ALWAYS respond with valid JSON in the exact format specified below.

## Output Format

You must respond with a JSON object containing:
1. "presentation": The generated presentation object
2. "message": A brief friendly message about what you generated or changed

## Presentation Structure

{
  "presentation": {
    "title": "Presentation Title",
    "description": "Brief description of the presentation",
    "slides": [
      // Array of slide objects
    ]
  },
  "message": "I've created a 10-slide presentation about..."
}

## Slide Types

### 1. Content Slide (informational, no interaction)
{
  "type": "content",
  "title": "Welcome to the Workshop!",
  "description": "Today we'll explore the key concepts of effective teamwork...",
  "imagePrompt": "Professional team collaborating in a modern office with natural lighting, photorealistic style"
}

### 2. Quiz Slide (scored question with correct answer)
{
  "type": "quiz",
  "imagePrompt": "Eiffel Tower with Paris cityscape at sunset, illustration style",
  "question": {
    "type": "single-choice",
    "text": "What is the capital of France?",
    "timeLimit": 20,
    "answers": [
      { "text": "London" },
      { "text": "Paris" },
      { "text": "Berlin" },
      { "text": "Madrid" }
    ],
    "correctAnswerIndex": 1
  }
}

### 3. Poll Slide (no scoring, gather opinions)
{
  "type": "poll",
  "imagePrompt": "Diverse group of people learning in different ways - reading, listening, watching, doing, modern illustration",
  "pollQuestion": {
    "type": "poll-single",
    "text": "What is your preferred learning style?",
    "timeLimit": 30,
    "answers": [
      { "text": "Visual" },
      { "text": "Auditory" },
      { "text": "Reading/Writing" },
      { "text": "Kinesthetic" }
    ]
  }
}

### 4. Thoughts Collect Slide (word cloud collection)
{
  "type": "thoughts-collect",
  "thoughtsPrompt": "What challenges do you face in your daily work?",
  "thoughtsMaxPerPlayer": 3
}

### 5. Thoughts Results Slide (word cloud display)
{
  "type": "thoughts-results",
  "sourceSlideId": "thoughts-1",
  "title": "Your Challenges"
}

### 6. Rating Describe Slide (item to be rated)
{
  "type": "rating-describe",
  "ratingItem": {
    "title": "Feature A: Real-time Collaboration",
    "description": "The ability to work together on documents simultaneously..."
  }
}

### 7. Rating Input Slide (players rate the item)
{
  "type": "rating-input",
  "ratingInputSlideId": "rating-desc-1",
  "ratingMetric": {
    "type": "stars",
    "min": 1,
    "max": 5,
    "question": "How important is this feature to you?"
  }
}

### 8. Rating Results Slide (show rating results)
{
  "type": "rating-results",
  "sourceSlideId": "rating-input-1",
  "ratingResultsMode": "comparison"
}

### 9. Quiz Results Slide (show results from quiz questions)
{
  "type": "quiz-results",
  "sourceSlideIds": ["quiz-1", "quiz-2"],
  "resultsTitle": "Quiz Results",
  "resultsDisplayMode": "individual"
}
Note: resultsDisplayMode can be "individual" (show each question separately) or "combined" (summary grid)

### 10. Poll Results Slide (show results from poll questions)
{
  "type": "poll-results",
  "sourceSlideIds": ["poll-1"],
  "resultsTitle": "Poll Results",
  "resultsDisplayMode": "individual"
}
Note: resultsDisplayMode can be "individual" (show each poll separately) or "combined" (summary grid)

### 11. Leaderboard Slide (show scores)
{
  "type": "leaderboard",
  "leaderboardMode": "standard",
  "leaderboardMaxDisplay": 10
}

## Guidelines

1. Generate 8-12 slides by default unless the user specifies otherwise
2. ALWAYS start with a content slide (title/intro)
3. Mix interactive and content slides for engagement
4. End with either a summary content slide or a leaderboard (if there are quiz questions)
5. thoughts-collect MUST be followed by thoughts-results that references it
6. rating-describe MUST be followed by rating-input that references it
7. Use temporary IDs like "thoughts-1", "rating-desc-1", "quiz-1", "poll-1" for linking
8. For quiz questions: use 20 seconds for easy, 30 for medium
9. Provide 4 answer options for quiz/poll questions
10. Make wrong answers plausible but clearly incorrect
11. If the user asks to modify the presentation, only change what they request
12. Always respond with valid JSON - no markdown code blocks, no extra text
13. quiz-results can reference one or more quiz slides via sourceSlideIds array
14. poll-results can reference one or more poll slides via sourceSlideIds array
15. Consider adding quiz-results after a series of quiz questions to reveal answers
16. Consider adding poll-results after poll questions to show audience opinions
17. For content, quiz, and poll slides, include "imagePrompt" with a descriptive prompt for AI image generation
18. Image prompts should be specific, mention the style (photorealistic, illustration, modern, etc.), and describe key visual elements
19. NEVER include text in image prompts - images should be purely visual

## Example Presentation Flow

For a "Team Workshop" presentation:
1. Content: Welcome and agenda
2. Poll: Ice breaker question
3. Poll-results: Show poll results
4. Content: Topic introduction
5. Thoughts-collect: Gather ideas
6. Thoughts-results: Show word cloud
7. Quiz: Knowledge check 1
8. Quiz: Knowledge check 2
9. Quiz-results: Show quiz results (references quiz-1, quiz-2)
10. Content: Key takeaways
11. Leaderboard: Final scores

## Handling Refinement Requests

When the user asks to modify an existing presentation:
- Keep slides they didn't mention
- Only modify/add/remove what they specifically request
- Acknowledge what you changed in the message field`;

/**
 * Converts conversation history to Gemini format
 */
function buildContents(
  prompt: string,
  conversationHistory?: ChatMessage[],
  currentPresentation?: GeneratedPresentation
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Add conversation history if exists
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Build current user message
  let userMessage = prompt;
  if (currentPresentation) {
    userMessage = `Current presentation state:\n${JSON.stringify(currentPresentation, null, 2)}\n\nUser request: ${prompt}`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return contents;
}

/**
 * Links results slides to their source slides by resolving temporary IDs
 */
function linkResultsSlides(slides: GeneratedPresentationSlide[]): void {
  // Create a map of temporary IDs to actual slide indices
  const tempIdMap = new Map<string, string>();

  // Track quiz and poll slide counts for sequential temp IDs
  let quizCount = 0;
  let pollCount = 0;

  // First pass: assign IDs and build temp ID map
  slides.forEach((slide, index) => {
    if (!slide.id) {
      slide.id = randomUUID();
    }
    slide.order = index;

    // Check for temporary IDs in the slide structure
    if (slide.type === 'thoughts-collect') {
      // Look for temp IDs like "thoughts-1", "thoughts-2", etc.
      const tempId = `thoughts-${index + 1}`;
      tempIdMap.set(tempId, slide.id);
    } else if (slide.type === 'rating-describe') {
      const tempId = `rating-desc-${index + 1}`;
      tempIdMap.set(tempId, slide.id);
    } else if (slide.type === 'rating-input') {
      const tempId = `rating-input-${index + 1}`;
      tempIdMap.set(tempId, slide.id);
    } else if (slide.type === 'quiz') {
      // Map quiz slides: quiz-1, quiz-2, etc. (sequential count, not index)
      quizCount++;
      const tempId = `quiz-${quizCount}`;
      tempIdMap.set(tempId, slide.id);
    } else if (slide.type === 'poll') {
      // Map poll slides: poll-1, poll-2, etc. (sequential count, not index)
      pollCount++;
      const tempId = `poll-${pollCount}`;
      tempIdMap.set(tempId, slide.id);
    }
  });

  // Second pass: resolve references
  slides.forEach((slide) => {
    if (slide.sourceSlideId && tempIdMap.has(slide.sourceSlideId)) {
      slide.sourceSlideId = tempIdMap.get(slide.sourceSlideId)!;
    }
    if (slide.ratingInputSlideId && tempIdMap.has(slide.ratingInputSlideId)) {
      slide.ratingInputSlideId = tempIdMap.get(slide.ratingInputSlideId)!;
    }
    // Resolve sourceSlideIds array (for quiz-results and poll-results)
    if (slide.sourceSlideIds && Array.isArray(slide.sourceSlideIds)) {
      slide.sourceSlideIds = slide.sourceSlideIds.map(id =>
        tempIdMap.has(id) ? tempIdMap.get(id)! : id
      );
    }
  });
}

/**
 * Parses and validates the Gemini response
 */
function parsePresentationResponse(responseText: string): GeneratePresentationResponse {
  // Try to extract JSON from the response
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.presentation || !parsed.presentation.title || !Array.isArray(parsed.presentation.slides)) {
      throw new Error('Invalid presentation structure');
    }

    // Validate each slide
    for (const slide of parsed.presentation.slides) {
      if (!slide.type) {
        throw new Error('Slide missing type');
      }

      // Validate type-specific fields
      switch (slide.type) {
        case 'content':
          if (!slide.title && !slide.description) {
            throw new Error('Content slide must have title or description');
          }
          break;

        case 'quiz':
          if (!slide.question?.text || !Array.isArray(slide.question?.answers)) {
            throw new Error('Quiz slide must have question with text and answers');
          }
          if (typeof slide.question.correctAnswerIndex !== 'number') {
            throw new Error('Quiz slide must have correctAnswerIndex');
          }
          // Set default time limit
          if (!slide.question.timeLimit) {
            slide.question.timeLimit = 20;
          }
          break;

        case 'poll':
          if (!slide.pollQuestion?.text || !Array.isArray(slide.pollQuestion?.answers)) {
            throw new Error('Poll slide must have pollQuestion with text and answers');
          }
          // Set default time limit
          if (!slide.pollQuestion.timeLimit) {
            slide.pollQuestion.timeLimit = 30;
          }
          // Map pollQuestion to question for frontend compatibility
          // The frontend PresentationSlide type uses 'question' field for both quiz and poll
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (slide as any).question = slide.pollQuestion;
          break;

        case 'thoughts-collect':
          if (!slide.thoughtsPrompt) {
            throw new Error('Thoughts-collect slide must have thoughtsPrompt');
          }
          // Set default max per player
          if (!slide.thoughtsMaxPerPlayer) {
            slide.thoughtsMaxPerPlayer = 3;
          }
          break;

        case 'thoughts-results':
          // sourceSlideId will be linked later
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
          // Set defaults for rating metric
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
          // Set default mode
          if (!slide.ratingResultsMode) {
            slide.ratingResultsMode = 'single';
          }
          break;

        case 'rating-summary':
          // Set defaults for summary slide
          if (!slide.summaryTitle) {
            slide.summaryTitle = 'Rating Summary';
          }
          if (!slide.summaryDefaultView) {
            slide.summaryDefaultView = 'ranking';
          }
          break;

        case 'leaderboard':
          // Set defaults
          if (!slide.leaderboardMode) {
            slide.leaderboardMode = 'standard';
          }
          if (!slide.leaderboardMaxDisplay) {
            slide.leaderboardMaxDisplay = 10;
          }
          break;

        case 'quiz-results':
          // Set defaults for quiz results slide
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
          // Set defaults for poll results slide
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

    // Link results slides to their sources
    linkResultsSlides(parsed.presentation.slides);

    return {
      presentation: parsed.presentation,
      message: parsed.message || 'Presentation generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse presentation response:', responseText);
    throw new HttpsError(
      'internal',
      'Failed to parse AI response. Please try again.'
    );
  }
}

/**
 * Cloud Function to generate presentation slides using Gemini 3 Pro
 */
export const generatePresentationWithAI = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 5,
    concurrency: 10,
    // Use custom service account with Vertex AI permissions
    serviceAccount: AI_SERVICE_ACCOUNT,
    // App Check enabled - verifies requests come from genuine app instances
    enforceAppCheck: true,
  },
  async (request): Promise<GeneratePresentationResponse> => {
    // Verify App Check token
    verifyAppCheck(request);

    // Rate limiting: 10 requests per hour per user (high cost operation)
    if (request.auth?.uid) {
      enforceRateLimitInMemory(request.auth.uid, 10, 3600);
    }

    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to generate presentations with AI'
      );
    }

    const data = request.data as GeneratePresentationRequest;

    // Validate prompt
    if (!data.prompt || typeof data.prompt !== 'string' || data.prompt.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'A prompt is required to generate a presentation'
      );
    }

    if (data.prompt.length > 2000) {
      throw new HttpsError(
        'invalid-argument',
        'Prompt must be less than 2000 characters'
      );
    }

    try {
      // Initialize Gemini client with Vertex AI
      const client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
      });

      // Build the conversation contents
      const contents = buildContents(
        data.prompt,
        data.conversationHistory,
        data.currentPresentation
      );

      // Call Gemini
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 8192,
        },
      });

      // Extract text from response
      const responseText = response.text;
      if (!responseText) {
        throw new HttpsError(
          'internal',
          'No response received from AI model'
        );
      }

      // Parse and validate the response
      const result = parsePresentationResponse(responseText);

      console.log(`Presentation generated for user ${request.auth.uid}: ${result.presentation.title} with ${result.presentation.slides.length} slides`);

      return result;
    } catch (error) {
      console.error('Error generating presentation with AI:', error);

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle specific Gemini errors
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new HttpsError(
            'resource-exhausted',
            'AI quota exceeded. Please try again later.'
          );
        }
        if (error.message.includes('safety')) {
          throw new HttpsError(
            'invalid-argument',
            'Your prompt was flagged by content safety filters. Please rephrase.'
          );
        }
      }

      throw new HttpsError(
        'internal',
        'Failed to generate presentation. Please try again.'
      );
    }
  }
);
