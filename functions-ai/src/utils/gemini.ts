import { GoogleGenAI, Type } from '@google/genai';
import type { FunctionDeclaration, Content, Part, Tool } from '@google/genai';
import { HttpsError } from 'firebase-functions/v2/https';

export { Type };

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

// ── Function Calling with Tools ──

export interface ToolDefinition {
  declaration: FunctionDeclaration;
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface ToolCallLogEntry {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

/**
 * Call Gemini with function calling support.
 * Handles the multi-turn loop: Gemini may call tools, we execute them
 * and send results back, up to maxToolCalls iterations.
 */
export async function callGeminiWithTools(
  client: GoogleGenAI,
  model: string,
  systemPrompt: string,
  prompt: string,
  tools: ToolDefinition[],
  options?: { maxToolCalls?: number; useSearch?: boolean }
): Promise<{ text: string; toolCallLog: ToolCallLogEntry[] }> {
  const maxToolCalls = options?.maxToolCalls ?? 3;
  const toolCallLog: ToolCallLogEntry[] = [];

  const geminiTools: Tool[] = [
    { functionDeclarations: tools.map((t) => t.declaration) },
  ];
  if (options?.useSearch) {
    geminiTools.push({ googleSearch: {} });
  }

  const contents: Content[] = [
    { role: 'user', parts: [{ text: prompt }] },
  ];

  let toolCallCount = 0;
  let retries = 0;
  const maxRetries = 3;
  const baseDelay = 1500;

  while (toolCallCount <= maxToolCalls) {
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: geminiTools,
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 65536,
        },
      });
      retries = 0;
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        throw new HttpsError('resource-exhausted', 'AI rate limit exceeded. Please wait a moment and try again.');
      }
      if (error.message?.includes('400') || error.message?.toLowerCase().includes('token limit')) {
        throw new HttpsError('invalid-argument', 'Request too large. Please reduce the amount of context.');
      }
      const isRetryable = error.message?.includes('500') || error.message?.includes('503') || error.message?.includes('504')
        || error.message?.toLowerCase().includes('internal') || error.message?.toLowerCase().includes('overloaded');
      if (isRetryable && retries < maxRetries) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, retries - 1)));
        continue;
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', `AI request failed: ${error.message}`);
    }

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text;
      if (!text) {
        throw new HttpsError('internal', 'No response received from AI model');
      }
      return { text, toolCallLog };
    }

    if (toolCallCount >= maxToolCalls) {
      const text = response.text || '';
      if (text) return { text, toolCallLog };
      throw new HttpsError('internal', 'AI model exceeded max tool calls without producing output');
    }

    // Append model's function call response to conversation
    contents.push({
      role: 'model',
      parts: functionCalls.map((fc) => ({ functionCall: fc })),
    });

    // Execute each function call and collect responses
    const responseParts: Part[] = [];
    for (const fc of functionCalls) {
      const toolDef = tools.find((t) => t.declaration.name === fc.name);
      if (!toolDef) {
        responseParts.push({
          functionResponse: { name: fc.name!, response: { error: `Unknown function: ${fc.name}` } },
        });
        continue;
      }

      try {
        const result = await toolDef.execute(fc.args || {});
        toolCallLog.push({ name: fc.name!, args: fc.args || {}, result });
        responseParts.push({
          functionResponse: { name: fc.name!, response: { output: result } },
        });
      } catch (execError: any) {
        responseParts.push({
          functionResponse: { name: fc.name!, response: { error: execError.message || 'Tool execution failed' } },
        });
      }

      toolCallCount++;
    }

    contents.push({ role: 'user', parts: responseParts });
  }

  throw new HttpsError('internal', 'AI request failed: tool calling loop did not converge');
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
