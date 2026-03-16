import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import { ALLOWED_ORIGINS, REGION, GEMINI_MODEL, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from './appCheck';
import { enforceRateLimitInMemory } from './rateLimit';
import type { ChatMessage } from '../types';

export type GeminiContents = Array<{ role: string; parts: Array<{ text: string }> }>;

interface AIHandlerOptions<TRequest extends { prompt: string }, TResponse> {
  systemPrompt: string;
  activityType: string;
  maxPromptLength?: number;
  buildContents: (data: TRequest) => GeminiContents;
  parseResponse: (responseText: string) => TResponse;
  getSuccessLog: (uid: string, result: TResponse) => string;
  validateRequest?: (data: TRequest) => void;
}

/**
 * Creates a Cloud Function handler with shared boilerplate:
 * onCall config, App Check, rate limiting, auth, prompt validation,
 * Gemini client init, API call, response extraction, and error handling.
 */
export function createAIHandler<TRequest extends { prompt: string }, TResponse>(
  options: AIHandlerOptions<TRequest, TResponse>
) {
  const maxPromptLength = options.maxPromptLength ?? 2000;

  return onCall(
    {
      region: REGION,
      cors: ALLOWED_ORIGINS,
      timeoutSeconds: 60,
      memory: '512MiB',
      maxInstances: 5,
      concurrency: 10,
      serviceAccount: AI_SERVICE_ACCOUNT,
      enforceAppCheck: true,
    },
    async (request): Promise<TResponse> => {
      verifyAppCheck(request);

      if (request.auth?.uid) {
        enforceRateLimitInMemory(request.auth.uid, 10, 3600);
      }

      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          `You must be signed in to generate ${options.activityType}s with AI`
        );
      }

      const data = request.data as TRequest;

      if (!data.prompt || typeof data.prompt !== 'string' || data.prompt.trim().length === 0) {
        throw new HttpsError(
          'invalid-argument',
          `A prompt is required to generate a ${options.activityType}`
        );
      }

      if (data.prompt.length > maxPromptLength) {
        throw new HttpsError(
          'invalid-argument',
          `Prompt must be less than ${maxPromptLength} characters`
        );
      }

      if (options.validateRequest) {
        options.validateRequest(data);
      }

      try {
        const client = new GoogleGenAI({
          vertexai: true,
          project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
          location: 'global',
        });

        const contents = options.buildContents(data);

        const response = await client.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: options.systemPrompt,
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 8192,
          },
        });

        const responseText = response.text;
        if (!responseText) {
          throw new HttpsError('internal', 'No response received from AI model');
        }

        const result = options.parseResponse(responseText);
        console.log(options.getSuccessLog(request.auth.uid, result));
        return result;
      } catch (error) {
        console.error(`Error generating ${options.activityType} with AI:`, error);

        if (error instanceof HttpsError) {
          throw error;
        }

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
          `Failed to generate ${options.activityType}. Please try again.`
        );
      }
    }
  );
}

/**
 * Builds Gemini conversation contents from chat history, current state, and prompt.
 * Shared across all AI generators.
 */
export function buildGeminiContents(
  prompt: string,
  conversationHistory?: ChatMessage[],
  currentState?: { label: string; data: unknown },
  attachedContent?: string
): GeminiContents {
  const contents: GeminiContents = [];

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  let userMessage = '';
  if (attachedContent) {
    userMessage += `Reference content provided by the user:\n${attachedContent}\n\n`;
  }
  if (currentState) {
    userMessage += `Current ${currentState.label} state:\n${JSON.stringify(currentState.data, null, 2)}\n\n`;
  }
  userMessage += (currentState || attachedContent) ? `User request: ${prompt}` : prompt;

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return contents;
}
