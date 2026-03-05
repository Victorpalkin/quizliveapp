import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import { enforceRateLimitInMemory } from '../utils/rateLimit';
import {
  GeneratePollRequest,
  GeneratePollResponse,
  GeneratedPoll,
  ChatMessage,
} from '../types';

// System prompt that instructs Gemini how to generate polls
const SYSTEM_PROMPT = `You are a poll generation assistant for an interactive audience engagement application.

Your task is to generate poll questions based on user prompts. Polls are used to gather opinions and feedback - there are NO correct answers. You must ALWAYS respond with valid JSON in the exact format specified below.

## Output Format

You must respond with a JSON object containing:
1. "poll": The generated poll object
2. "message": A brief friendly message about what you generated or changed

## Poll Structure

{
  "poll": {
    "title": "Poll Title",
    "description": "Brief description of the poll",
    "questions": [
      // Array of question objects
    ]
  },
  "message": "I've created a 5-question feedback poll about..."
}

## Question Types

### 1. Single Choice (one selection allowed)
{
  "type": "poll-single",
  "text": "What is your preferred meeting time?",
  "timeLimit": 30,
  "showLiveResults": true,
  "answers": [
    { "text": "Morning (9-12)" },
    { "text": "Afternoon (12-5)" },
    { "text": "Evening (5-8)" },
    { "text": "No preference" }
  ]
}

### 2. Multiple Choice (multiple selections allowed)
{
  "type": "poll-multiple",
  "text": "Which topics interest you? (select all that apply)",
  "timeLimit": 30,
  "showLiveResults": true,
  "answers": [
    { "text": "Technology" },
    { "text": "Business" },
    { "text": "Design" },
    { "text": "Marketing" }
  ]
}

### 3. Free Text (open-ended response)
{
  "type": "poll-free-text",
  "text": "What suggestions do you have for improving our service?",
  "timeLimit": 60,
  "showLiveResults": true,
  "placeholder": "Share your thoughts...",
  "maxLength": 500
}

## Guidelines

1. Default to 5 questions unless the user specifies otherwise
2. Use variety in question types - mix single choice, multiple choice, and free text
3. Free text is great for open feedback, suggestions, and detailed opinions
4. Time limits: 30 seconds for choice questions, 60 seconds for free text
5. Provide 3-5 answer options for choice questions
6. Make answers mutually exclusive for single choice, allow overlap for multiple choice
7. Use neutral, non-leading question wording
8. Remember: This is for gathering opinions, NOT a quiz - there are NO correct answers
9. If the user asks to modify the poll, only change what they request
10. Always respond with valid JSON - no markdown code blocks, no extra text
11. Set showLiveResults to true by default

## Good Poll Question Examples

- "How would you rate today's session?" (poll-single with scale options)
- "What topics should we cover next?" (poll-multiple with topic options)
- "What's one thing we could improve?" (poll-free-text)
- "Which format do you prefer?" (poll-single with format options)

## Handling Refinement Requests

When the user asks to modify an existing poll:
- Keep questions they didn't mention
- Only modify/add/remove what they specifically request
- Acknowledge what you changed in the message field`;

/**
 * Converts conversation history to Gemini format
 */
function buildContents(
  prompt: string,
  conversationHistory?: ChatMessage[],
  currentPoll?: GeneratedPoll
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
  if (currentPoll) {
    userMessage = `Current poll state:\n${JSON.stringify(currentPoll, null, 2)}\n\nUser request: ${prompt}`;
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
function parsePollResponse(responseText: string): GeneratePollResponse {
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
    if (!parsed.poll || !parsed.poll.title || !parsed.poll.questions) {
      throw new Error('Invalid poll structure');
    }

    // Validate each question
    for (const question of parsed.poll.questions) {
      if (!question.type || !question.text) {
        throw new Error('Invalid question structure');
      }

      // Set default time limit if not provided
      if (!question.timeLimit) {
        question.timeLimit = question.type === 'poll-free-text' ? 60 : 30;
      }

      // Set default showLiveResults if not provided
      if (question.showLiveResults === undefined) {
        question.showLiveResults = true;
      }

      // Validate type-specific fields
      if (question.type === 'poll-single' || question.type === 'poll-multiple') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error(`${question.type} question must have at least 2 answers`);
        }
      } else if (question.type === 'poll-free-text') {
        // Set defaults for free text questions
        if (!question.placeholder) {
          question.placeholder = 'Share your thoughts...';
        }
        if (!question.maxLength) {
          question.maxLength = 500;
        }
      } else {
        throw new Error(`Unknown question type: ${question.type}`);
      }
    }

    return {
      poll: parsed.poll,
      message: parsed.message || 'Poll generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse poll response:', responseText);
    throw new HttpsError(
      'internal',
      'Failed to parse AI response. Please try again.'
    );
  }
}

/**
 * Cloud Function to generate poll questions using Gemini 3 Pro
 */
export const generatePollWithAI = onCall(
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
  async (request): Promise<GeneratePollResponse> => {
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
        'You must be signed in to generate polls with AI'
      );
    }

    const data = request.data as GeneratePollRequest;

    // Validate prompt
    if (!data.prompt || typeof data.prompt !== 'string' || data.prompt.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'A prompt is required to generate a poll'
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
        data.currentPoll
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
      const result = parsePollResponse(responseText);

      console.log(`Poll generated for user ${request.auth.uid}: ${result.poll.title} with ${result.poll.questions.length} questions`);

      return result;
    } catch (error) {
      console.error('Error generating poll with AI:', error);

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
        'Failed to generate poll. Please try again.'
      );
    }
  }
);
