import { GoogleGenAI } from '@google/genai';
import { HttpsError } from 'firebase-functions/v2/https';

// ── Model Constants ──

export const GEMINI_PRO = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH = 'gemini-3-flash-preview';
export const GEMINI_IMAGE = 'gemini-3.1-flash-image-preview';

// ── Client Factory ──

export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    location: 'global',
  });
}

// ── Gemini API Call with Retry ──

export async function callGeminiWithRetry(
  client: GoogleGenAI,
  model: string,
  systemPrompt: string,
  prompt: string,
  useSearch: boolean
): Promise<string> {
  let retries = 0;
  const maxRetries = 3;
  const baseDelay = 1500;

  while (retries <= maxRetries) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemPrompt,
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 65536,
        },
      });

      const text = response.text;
      if (!text) {
        throw new HttpsError('internal', 'No response received from AI model');
      }

      return text;
    } catch (error: any) {
      if (
        error.message?.includes('429') ||
        error.message?.toLowerCase().includes('rate limit')
      ) {
        throw new HttpsError(
          'resource-exhausted',
          'AI rate limit exceeded. Please wait a moment and try again.'
        );
      }

      if (
        error.message?.includes('400') ||
        error.message?.toLowerCase().includes('token limit')
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Request too large. Please reduce the amount of context or simplify your inputs.'
        );
      }

      const isRetryable =
        error.message?.includes('500') ||
        error.message?.includes('503') ||
        error.message?.includes('504') ||
        error.message?.toLowerCase().includes('internal') ||
        error.message?.toLowerCase().includes('overloaded') ||
        error.message?.toLowerCase().includes('deadline exceeded');

      if (isRetryable && retries < maxRetries) {
        retries++;
        const delay = baseDelay * Math.pow(2, retries - 1);
        console.warn(`Retrying Gemini API call (attempt ${retries}/${maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', `AI request failed: ${error.message}`);
    }
  }

  throw new HttpsError('internal', 'AI request failed after maximum retries');
}

// ── Structured JSON Extraction ──

/**
 * Call Gemini to extract structured JSON from text.
 * Handles markdown code block stripping and JSON parsing.
 * Returns null on any failure (extraction is best-effort).
 */
export async function extractJsonFromText(
  client: GoogleGenAI,
  extractionPrompt: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await client.models.generateContent({
      model: GEMINI_FLASH,
      contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text;
    if (!text) return null;

    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to extract JSON from text:', error);
    return null;
  }
}

// ── Common Error Handler ──

/**
 * Classify and re-throw errors from AI function catch blocks.
 * Call after checking for HttpsError instances.
 */
export function throwClassifiedError(error: unknown, context: string): never {
  if (error instanceof HttpsError) throw error;

  if (error instanceof Error) {
    if (error.message.includes('quota')) {
      throw new HttpsError('resource-exhausted', 'AI quota exceeded. Please try again later.');
    }
    if (error.message.includes('safety')) {
      throw new HttpsError('invalid-argument', 'Content was flagged by safety filters.');
    }
  }

  throw new HttpsError('internal', `Failed to ${context}. Please try again.`);
}
