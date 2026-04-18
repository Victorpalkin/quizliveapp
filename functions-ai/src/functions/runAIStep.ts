import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { ALLOWED_ORIGINS, REGION, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';

/**
 * Model for infographic image generation
 */
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

// ── Types ──

interface RunAIStepRequest {
  gameId: string;
  slideId: string;
  presentationId: string;
  nudge?: string;
  hostInputs?: Record<string, string | boolean>;
}

interface RunAIStepResponse {
  success: boolean;
  output: string;
  imageUrl?: string;
}

interface SummarizeSlideNudgesRequest {
  gameId: string;
  slideId: string;
}

interface SummarizeSlideNudgesResponse {
  success: boolean;
  summary: string;
}

interface AIStepConfig {
  stepPrompt: string;
  inputFields?: { id: string; label: string; type: string; placeholder?: string; helpText?: string; parentField?: string }[];
  outputExpectation?: string;
  enablePlayerNudges?: boolean;
  nudgeHints?: string[];
  enableGoogleSearch?: boolean;
  enableImageGeneration?: boolean;
  enableStructuredExtraction?: boolean;
  extractionHint?: string;
  contextSlideIds?: string[];
}

interface WorkflowConfig {
  systemPrompt: string;
  target?: string;
}

interface SlideOutput {
  aiOutput: string;
  structuredItems?: { id: string; name: string; description: string }[];
  imageUrl?: string;
  hostInputs?: Record<string, string | boolean>;
  generatedAt: number;
}

interface PresentationSlide {
  id: string;
  order: number;
  elements: {
    id: string;
    type: string;
    aiStepConfig?: AIStepConfig;
    content?: string;
    pollConfig?: { question: string; options: string[] };
    quizConfig?: { question: string };
    evaluationConfig?: { title: string };
    thoughtsConfig?: { prompt: string };
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

interface PresentationSettings {
  workflowConfig?: WorkflowConfig;
  [key: string]: unknown;
}

// ── Utility Functions ──

function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Call Gemini API with retry logic
 */
async function callGeminiWithRetry(
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

/**
 * Extract structured items from AI output using a separate Gemini call
 */
async function extractStructuredItems(
  client: GoogleGenAI,
  aiOutput: string,
  extractionHint?: string
): Promise<{ id: string; name: string; description: string }[] | null> {
  try {
    const hintClause = extractionHint
      ? `Extraction guidance: ${extractionHint}\n`
      : '';

    const extractionPrompt = `${hintClause}Extract all distinct items from this markdown output as JSON.\nReturn ONLY valid JSON: {"items": [{"id": "1", "name": "short name", "description": "1-sentence description"}]}\n\nContent:\n${aiOutput}`;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    const parsed = JSON.parse(jsonStr);
    if (!parsed.items || !Array.isArray(parsed.items)) return null;

    return parsed.items;
  } catch (error) {
    console.error('Failed to extract structured items:', error);
    return null;
  }
}

/**
 * Generate an infographic image and upload to Firebase Storage
 */
async function generateImage(
  client: GoogleGenAI,
  imagePrompt: string,
  gameId: string,
  slideId: string
): Promise<string> {
  const response = await client.models.generateContent({
    model: IMAGE_MODEL,
    contents: imagePrompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '16:9' },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  let imageData: string | undefined;
  let mimeType = 'image/png';

  for (const part of parts) {
    if (part && typeof part === 'object' && 'inlineData' in part && part.inlineData) {
      const inlineData = part.inlineData as { data?: string; mimeType?: string };
      if (inlineData.data) {
        imageData = inlineData.data;
        mimeType = inlineData.mimeType || 'image/png';
        break;
      }
    }
  }

  if (!imageData) {
    throw new HttpsError('internal', 'No image generated by AI');
  }

  const filePath = `ai-step/${gameId}/${slideId}/output.png`;
  const bucket = getStorage().bucket();
  const file = bucket.file(filePath);
  const downloadToken = randomUUID();

  await file.save(Buffer.from(imageData, 'base64'), {
    metadata: {
      contentType: mimeType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
}

/**
 * Load interaction results (poll, evaluation, thoughts, quiz) from slides
 * between context sources and the current slide.
 */
async function loadInteractionResults(
  db: admin.firestore.Firestore,
  gameId: string,
  slides: PresentationSlide[],
  currentSlideOrder: number,
  contextSlideIds: string[]
): Promise<string> {
  const parts: string[] = [];

  // Find the earliest context source order to determine the range of intermediate slides
  const contextOrders = contextSlideIds
    .map(id => slides.find(s => s.id === id)?.order ?? -1)
    .filter(o => o >= 0);
  const earliestContextOrder = contextOrders.length > 0 ? Math.min(...contextOrders) : 0;

  // Check all slides between earliest context and current slide for interaction results
  const intermediateSlidesToCheck = slides.filter(
    s => s.order >= earliestContextOrder && s.order < currentSlideOrder
  );

  for (const slide of intermediateSlidesToCheck) {
    for (const el of slide.elements) {
      try {
        if (el.type === 'poll') {
          const aggDoc = await db
            .collection('games').doc(gameId)
            .collection('aggregates').doc(el.id)
            .get();

          if (aggDoc.exists) {
            const data = aggDoc.data();
            const optionCounts = data?.optionCounts as Record<string, number> | undefined;
            if (optionCounts && Object.keys(optionCounts).length > 0) {
              const total = Object.values(optionCounts).reduce((s, v) => s + v, 0);
              const sorted = Object.entries(optionCounts).sort((a, b) => b[1] - a[1]);
              const winner = sorted[0];
              const pct = total > 0 ? Math.round((winner[1] / total) * 100) : 0;
              const question = el.pollConfig?.question || 'Poll';
              parts.push(`[Poll Result — "${question}"] Audience voted: ${winner[0]} (${pct}%, ${total} total votes). All options: ${sorted.map(([opt, cnt]) => `${opt}: ${cnt}`).join(', ')}`);
            }
          }
        } else if (el.type === 'evaluation') {
          const aggDoc = await db
            .collection('games').doc(gameId)
            .collection('aggregates').doc(el.id)
            .get();

          if (aggDoc.exists) {
            const data = aggDoc.data();
            const items = data?.items as { name: string; averageScore: number }[] | undefined;
            if (items && items.length > 0) {
              const sorted = [...items].sort((a, b) => b.averageScore - a.averageScore);
              const title = el.evaluationConfig?.title || 'Evaluation';
              parts.push(`[Evaluation Result — "${title}"] Audience ranked: ${sorted.map((item, i) => `${i + 1}. ${item.name} (${item.averageScore.toFixed(1)}/5)`).join(', ')}`);
            }
          }
        } else if (el.type === 'thoughts') {
          const responsesSnapshot = await db
            .collection('games').doc(gameId)
            .collection('responses').doc(el.id)
            .collection('items')
            .limit(50)
            .get();

          if (!responsesSnapshot.empty) {
            const thoughts = responsesSnapshot.docs
              .map(d => d.data().text as string)
              .filter(Boolean);
            if (thoughts.length > 0) {
              const prompt = el.thoughtsConfig?.prompt || 'Thoughts gathering';
              parts.push(`[Thoughts Result — "${prompt}"] ${thoughts.length} audience submissions: ${thoughts.slice(0, 20).map(t => `"${t}"`).join(', ')}${thoughts.length > 20 ? ` ... and ${thoughts.length - 20} more` : ''}`);
            }
          }
        } else if (el.type === 'quiz') {
          const aggDoc = await db
            .collection('games').doc(gameId)
            .collection('aggregates').doc(el.id)
            .get();

          if (aggDoc.exists) {
            const data = aggDoc.data();
            const totalResponses = data?.totalResponses as number | undefined;
            const correctCount = data?.correctCount as number | undefined;
            if (totalResponses && totalResponses > 0) {
              const pct = Math.round(((correctCount ?? 0) / totalResponses) * 100);
              parts.push(`[Quiz Result] Knowledge check: ${pct}% answered correctly (${totalResponses} responses)`);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to load interaction result for element ${el.id}:`, err);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Build context string from previous AI step outputs and interaction results
 */
async function buildContext(
  db: admin.firestore.Firestore,
  gameId: string,
  slides: PresentationSlide[],
  currentSlide: PresentationSlide,
  config: AIStepConfig,
  slideOutputs: Record<string, SlideOutput>,
  hostInputs?: Record<string, string | boolean>
): Promise<string> {
  const parts: string[] = [];

  // 1. Host inputs for current step
  if (hostInputs && Object.keys(hostInputs).length > 0) {
    parts.push(`User Inputs for Current Step:\n${JSON.stringify(hostInputs, null, 2)}`);
  }

  // 2. Previous AI step outputs (based on contextSlideIds or all prior ai-steps)
  const aiStepSlides = slides
    .filter(s => s.order < currentSlide.order && s.elements.some(el => el.type === 'ai-step'))
    .sort((a, b) => a.order - b.order);

  const contextSlideIds = config.contextSlideIds && config.contextSlideIds.length > 0
    ? config.contextSlideIds
    : aiStepSlides.map(s => s.id); // default: all prior ai-step slides

  const contextOutputs: { slideOrder: number; title: string; output: string; imageUrl?: string }[] = [];

  for (const slideId of contextSlideIds) {
    const slide = slides.find(s => s.id === slideId);
    const output = slideOutputs[slideId];
    if (!slide || !output?.aiOutput) continue;

    const title = slide.elements.find(el => el.type === 'text')?.content || `Slide ${slide.order + 1}`;
    contextOutputs.push({
      slideOrder: slide.order,
      title,
      output: output.aiOutput,
      imageUrl: output.imageUrl,
    });
  }

  if (contextOutputs.length > 0) {
    contextOutputs.sort((a, b) => a.slideOrder - b.slideOrder);
    parts.push('Previous AI Step Results:');

    for (const ctx of contextOutputs) {
      // For final-report-style steps that reference many, include full output
      // Otherwise truncate very long outputs
      const maxLen = contextSlideIds.length > 5 ? 4000 : 3000;
      const content = ctx.output.length > maxLen
        ? ctx.output.substring(0, maxLen) + '... [truncated for brevity]'
        : ctx.output;
      parts.push(`--- ${ctx.title} (Slide ${ctx.slideOrder + 1}) ---\n${content}`);
      if (ctx.imageUrl) {
        parts.push(`Note: An infographic/image was generated for this step.`);
      }
    }
  }

  // 3. Interaction results from intermediate slides
  const interactionResults = await loadInteractionResults(
    db, gameId, slides, currentSlide.order, contextSlideIds
  );
  if (interactionResults) {
    parts.push(`Audience Interaction Results:\n${interactionResults}`);
  }

  return parts.join('\n\n');
}

// ── Cloud Function: runAIStep ──

export const runAIStep = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 300,
    memory: '1GiB',
    serviceAccount: AI_SERVICE_ACCOUNT,
    enforceAppCheck: false,
  },
  async (request): Promise<RunAIStepResponse> => {
    verifyAppCheck(request);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    const data = request.data as RunAIStepRequest;

    if (!data.gameId || typeof data.gameId !== 'string') {
      throw new HttpsError('invalid-argument', 'Game ID is required');
    }
    if (!data.slideId || typeof data.slideId !== 'string') {
      throw new HttpsError('invalid-argument', 'Slide ID is required');
    }
    if (!data.presentationId || typeof data.presentationId !== 'string') {
      throw new HttpsError('invalid-argument', 'Presentation ID is required');
    }

    const db = admin.firestore();

    try {
      // Verify user is the game host
      const gameDoc = await db.collection('games').doc(data.gameId).get();
      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }
      const gameData = gameDoc.data();
      if (gameData?.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can run AI steps');
      }

      // Load presentation to get slide config and workflow settings
      const presDoc = await db.collection('presentations').doc(data.presentationId).get();
      if (!presDoc.exists) {
        throw new HttpsError('not-found', 'Presentation not found');
      }
      const presData = presDoc.data();
      const slides = (presData?.slides || []) as PresentationSlide[];
      const settings = (presData?.settings || {}) as PresentationSettings;

      // Find the target slide and its ai-step element
      const currentSlide = slides.find(s => s.id === data.slideId);
      if (!currentSlide) {
        throw new HttpsError('not-found', 'Slide not found in presentation');
      }

      const aiStepElement = currentSlide.elements.find(el => el.type === 'ai-step');
      if (!aiStepElement) {
        throw new HttpsError('not-found', 'No ai-step element found on this slide');
      }

      const config = aiStepElement.aiStepConfig;
      if (!config) {
        throw new HttpsError('invalid-argument', 'AI step has no configuration');
      }

      // Set processing flag
      const stateRef = db.collection('games').doc(data.gameId)
        .collection('workflowState').doc('state');

      await stateRef.set(
        { isProcessing: true, processingSlideId: data.slideId },
        { merge: true }
      );

      // Load current workflow state for previous outputs
      const stateDoc = await stateRef.get();
      const currentState = stateDoc.exists ? stateDoc.data() : {};
      const slideOutputs = (currentState?.slideOutputs || {}) as Record<string, SlideOutput>;

      // Build context from previous AI steps + interaction results
      const contextString = await buildContext(
        db, data.gameId, slides, currentSlide, config, slideOutputs, data.hostInputs
      );

      // Load nudges for this slide (if enabled)
      let nudgeSummary = '';
      if (config.enablePlayerNudges !== false) {
        const nudgesSnapshot = await db
          .collection('games').doc(data.gameId)
          .collection('slideNudges').doc(data.slideId)
          .collection('nudges')
          .get();

        if (!nudgesSnapshot.empty) {
          const nudgeTexts = nudgesSnapshot.docs
            .map(d => {
              const nd = d.data();
              return `- ${sanitizeInput(nd.playerName)}: "${sanitizeInput(nd.text)}"`;
            })
            .join('\n');
          nudgeSummary = `\nAudience suggestions:\n${nudgeTexts}`;
        }
      }

      // Determine system prompt
      const systemPrompt = settings.workflowConfig?.systemPrompt
        || 'You are a helpful AI assistant. Provide clear, well-structured markdown output.';

      // Target context (e.g., company name)
      const targetContext = settings.workflowConfig?.target
        ? `\nTarget/Subject: ${sanitizeInput(settings.workflowConfig.target)}`
        : '';

      // Current step output (for regeneration)
      const currentOutput = slideOutputs[data.slideId]?.aiOutput || '';

      // Sanitize host nudge
      const sanitizedNudge = data.nudge ? sanitizeInput(data.nudge) : undefined;

      // Compose full prompt
      const fullPrompt = `${targetContext}

RELEVANT CONTEXT:
${contextString}
${nudgeSummary}

${currentOutput ? `CURRENT STATE:\n${currentOutput}\n` : ''}
TASK:
${config.stepPrompt}

${sanitizedNudge ? `HOST REFINEMENT REQUEST: "${sanitizedNudge}"` : 'Generate a fresh, high-quality response for the task based on the context above.'}

INSTRUCTIONS:
1. If a refinement request is provided, update the current state accordingly.
2. If no refinement is provided, generate the initial output for this step.
3. Use professional, well-structured language.
4. Output ONLY the markdown content. No conversational filler.`;

      // Select model based on context size
      const isComplexTask = contextString.length > 10000 || (data.nudge && data.nudge.length > 200);
      const model = isComplexTask ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
      const useSearch = !!config.enableGoogleSearch && !data.nudge;

      // Initialize Gemini client
      const client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
      });

      // Call Gemini
      const aiOutput = await callGeminiWithRetry(client, model, systemPrompt, fullPrompt, useSearch);

      // Image generation (if enabled)
      let imageUrl: string | undefined;
      if (config.enableImageGeneration) {
        try {
          imageUrl = await generateImage(client, aiOutput, data.gameId, data.slideId);
          console.log(`Image generated for slide ${data.slideId}: ${imageUrl}`);
        } catch (imageError) {
          console.error('Image generation failed, continuing with text output:', imageError);
        }
      }

      // Structured extraction (if enabled)
      let structuredItems: { id: string; name: string; description: string }[] | null = null;
      if (config.enableStructuredExtraction) {
        structuredItems = await extractStructuredItems(client, aiOutput, config.extractionHint);
      }

      // Write results to workflow state
      const outputData: SlideOutput = {
        aiOutput,
        generatedAt: Date.now(),
        ...(structuredItems ? { structuredItems } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(data.hostInputs ? { hostInputs: data.hostInputs } : {}),
      };

      await stateRef.update({
        [`slideOutputs.${data.slideId}`]: outputData,
        isProcessing: false,
        processingSlideId: admin.firestore.FieldValue.delete(),
      });

      console.log(`Completed AI step for slide ${data.slideId} in game ${data.gameId}`);

      return {
        success: true,
        output: aiOutput,
        ...(imageUrl ? { imageUrl } : {}),
      };
    } catch (error) {
      console.error('Error running AI step:', error);

      // Reset processing flag
      try {
        await db.collection('games').doc(data.gameId)
          .collection('workflowState').doc('state')
          .set(
            { isProcessing: false, processingSlideId: admin.firestore.FieldValue.delete() },
            { merge: true }
          );
      } catch (updateError) {
        console.error('Failed to reset processing flag:', updateError);
      }

      if (error instanceof HttpsError) throw error;

      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new HttpsError('resource-exhausted', 'AI quota exceeded. Please try again later.');
        }
        if (error.message.includes('safety')) {
          throw new HttpsError('invalid-argument', 'Content was flagged by safety filters.');
        }
      }

      throw new HttpsError('internal', 'Failed to run AI step. Please try again.');
    }
  }
);

// ── Cloud Function: summarizeSlideNudges ──

export const summarizeSlideNudges = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '256MiB',
    serviceAccount: AI_SERVICE_ACCOUNT,
    enforceAppCheck: false,
  },
  async (request): Promise<SummarizeSlideNudgesResponse> => {
    verifyAppCheck(request);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    const data = request.data as SummarizeSlideNudgesRequest;

    if (!data.gameId || typeof data.gameId !== 'string') {
      throw new HttpsError('invalid-argument', 'Game ID is required');
    }
    if (!data.slideId || typeof data.slideId !== 'string') {
      throw new HttpsError('invalid-argument', 'Slide ID is required');
    }

    const db = admin.firestore();

    try {
      // Verify user is the game host
      const gameDoc = await db.collection('games').doc(data.gameId).get();
      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }
      const gameData = gameDoc.data();
      if (gameData?.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can summarize nudges');
      }

      // Read nudges for this slide
      const nudgesSnapshot = await db
        .collection('games').doc(data.gameId)
        .collection('slideNudges').doc(data.slideId)
        .collection('nudges')
        .get();

      if (nudgesSnapshot.empty) {
        return { success: true, summary: '' };
      }

      const nudges = nudgesSnapshot.docs.map(d => d.data());

      // Initialize Gemini client
      const client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
      });

      const suggestionsText = nudges
        .map(n => `- ${sanitizeInput(n.playerName)}: "${sanitizeInput(n.text)}"`)
        .join('\n');

      const prompt = `Given these audience suggestions, synthesize them into a single, coherent refinement request that captures the key themes and specific guidance. Be concise (1-3 sentences).

Suggestions:
${suggestionsText}

Output ONLY the synthesized request.`;

      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.5,
          maxOutputTokens: 1024,
        },
      });

      const summary = response.text || '';
      console.log(`Summarized ${nudges.length} nudges for slide ${data.slideId} in game ${data.gameId}`);

      return { success: true, summary };
    } catch (error) {
      console.error('Error summarizing nudges:', error);

      if (error instanceof HttpsError) throw error;

      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new HttpsError('resource-exhausted', 'AI quota exceeded. Please try again later.');
        }
      }

      throw new HttpsError('internal', 'Failed to summarize nudges. Please try again.');
    }
  }
);
