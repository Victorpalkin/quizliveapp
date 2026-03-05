import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import { enforceRateLimitInMemory } from '../utils/rateLimit';
import {
  GenerateQuizRequest,
  GenerateQuizResponse,
  GeneratedQuiz,
  ChatMessage,
} from '../types';

// System prompt that instructs Gemini how to generate quizzes
const SYSTEM_PROMPT = `You are a quiz generation assistant for an interactive quiz game application.

Your task is to generate quiz questions based on user prompts. You must ALWAYS respond with valid JSON in the exact format specified below.

## Output Format

You must respond with a JSON object containing:
1. "quiz": The generated quiz object
2. "message": A brief friendly message about what you generated or changed

## Quiz Structure

{
  "quiz": {
    "title": "Quiz Title",
    "description": "Brief description of the quiz",
    "questions": [
      // Array of question objects
    ]
  },
  "message": "I've created a 10-question quiz about European capitals..."
}

## Question Types

### 1. Single Choice (one correct answer)
{
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

### 2. Multiple Choice (multiple correct answers)
{
  "type": "multiple-choice",
  "text": "Which of these are EU member states?",
  "timeLimit": 30,
  "answers": [
    { "text": "Germany" },
    { "text": "Norway" },
    { "text": "France" },
    { "text": "Switzerland" }
  ],
  "correctAnswerIndices": [0, 2]
}

### 3. Slider (numeric answer)
{
  "type": "slider",
  "text": "In what year did World War II end?",
  "timeLimit": 20,
  "minValue": 1940,
  "maxValue": 1950,
  "correctValue": 1945,
  "step": 1
}

### 4. Free Response (player types their answer)
{
  "type": "free-response",
  "text": "What is the chemical symbol for gold?",
  "timeLimit": 30,
  "correctAnswer": "Au",
  "alternativeAnswers": ["au", "AU"],
  "caseSensitive": false,
  "allowTypos": true
}

### 5. Slide (informational, no answer required)
{
  "type": "slide",
  "text": "Fun Fact!",
  "description": "The Eiffel Tower was built in 1889 for the World's Fair.",
  "timeLimit": 10
}

## Guidelines

1. Default to 10 questions unless the user specifies otherwise
2. Use variety in question types (mostly single-choice, with some multiple-choice, sliders, and free-response)
3. Free-response is great for short answers (1-3 words) like names, dates, terms, symbols
4. Time limits: 20 seconds for easy, 30 for medium, 60 for hard questions
5. Provide 4 answer options for choice questions
6. Make wrong answers plausible but clearly incorrect
7. Ensure factual accuracy
8. If the user asks to modify the quiz, only change what they request
9. Always respond with valid JSON - no markdown code blocks, no extra text

## Handling Refinement Requests

When the user asks to modify an existing quiz:
- Keep questions they didn't mention
- Only modify/add/remove what they specifically request
- Acknowledge what you changed in the message field`;

/**
 * Converts conversation history to Gemini format
 */
function buildContents(
  prompt: string,
  conversationHistory?: ChatMessage[],
  currentQuiz?: GeneratedQuiz
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
  if (currentQuiz) {
    userMessage = `Current quiz state:\n${JSON.stringify(currentQuiz, null, 2)}\n\nUser request: ${prompt}`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return contents;
}

/**
 * Parses and validates the Gemini response
 */
function parseQuizResponse(responseText: string): GenerateQuizResponse {
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
    if (!parsed.quiz || !parsed.quiz.title || !parsed.quiz.questions) {
      throw new Error('Invalid quiz structure');
    }

    // Validate each question
    for (const question of parsed.quiz.questions) {
      if (!question.type || !question.text) {
        throw new Error('Invalid question structure');
      }

      // Set default time limit if not provided
      if (!question.timeLimit) {
        question.timeLimit = 20;
      }

      // Validate type-specific fields
      if (question.type === 'single-choice') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error('Single-choice question must have at least 2 answers');
        }
        if (typeof question.correctAnswerIndex !== 'number') {
          throw new Error('Single-choice question must have correctAnswerIndex');
        }
      } else if (question.type === 'multiple-choice') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error('Multiple-choice question must have at least 2 answers');
        }
        if (!Array.isArray(question.correctAnswerIndices) || question.correctAnswerIndices.length === 0) {
          throw new Error('Multiple-choice question must have correctAnswerIndices');
        }
      } else if (question.type === 'slider') {
        if (typeof question.minValue !== 'number' || typeof question.maxValue !== 'number') {
          throw new Error('Slider question must have minValue and maxValue');
        }
        if (typeof question.correctValue !== 'number') {
          throw new Error('Slider question must have correctValue');
        }
      } else if (question.type === 'free-response') {
        if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
          throw new Error('Free-response question must have correctAnswer');
        }
        // Set defaults for optional fields
        if (question.caseSensitive === undefined) {
          question.caseSensitive = false;
        }
        if (question.allowTypos === undefined) {
          question.allowTypos = true;
        }
        if (!Array.isArray(question.alternativeAnswers)) {
          question.alternativeAnswers = [];
        }
      }
    }

    return {
      quiz: parsed.quiz,
      message: parsed.message || 'Quiz generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse quiz response:', responseText);
    throw new HttpsError(
      'internal',
      'Failed to parse AI response. Please try again.'
    );
  }
}

/**
 * Cloud Function to generate quiz questions using Gemini 3 Pro
 */
export const generateQuizWithAI = onCall(
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
  async (request): Promise<GenerateQuizResponse> => {
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
        'You must be signed in to generate quizzes with AI'
      );
    }

    const data = request.data as GenerateQuizRequest;

    // Validate prompt
    if (!data.prompt || typeof data.prompt !== 'string' || data.prompt.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'A prompt is required to generate a quiz'
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
        data.currentQuiz
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
      const result = parseQuizResponse(responseText);

      console.log(`Quiz generated for user ${request.auth.uid}: ${result.quiz.title} with ${result.quiz.questions.length} questions`);

      return result;
    } catch (error) {
      console.error('Error generating quiz with AI:', error);

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
        'Failed to generate quiz. Please try again.'
      );
    }
  }
);
