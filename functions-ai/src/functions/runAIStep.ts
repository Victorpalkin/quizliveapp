import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS, REGION, AI_SERVICE_ACCOUNT } from '../config';
import { verifyAppCheck } from '../utils/appCheck';
import {
  createGeminiClient,
  callGeminiWithRetry,
  extractJsonFromText,
  throwClassifiedError,
  GEMINI_PRO,
  GEMINI_FLASH,
} from '../utils/gemini';
import { generateAndUploadImage } from '../utils/imageGeneration';
import { loadInteractionResults } from '../utils/interactionResults';

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
    pollConfig?: { question: string; options: { text: string }[] };
    quizConfig?: { question: string; correctAnswerIndex: number };
    evaluationConfig?: { title: string; items: { id: string; text: string }[]; metrics: { id: string; name: string }[] };
    thoughtsConfig?: { prompt: string };
    ratingConfig?: { itemTitle: string; items?: { id: string; text: string }[]; question?: string };
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
 * Extract structured items from AI output using a separate Gemini call
 */
async function extractStructuredItems(
  client: ReturnType<typeof createGeminiClient>,
  aiOutput: string,
  extractionHint?: string
): Promise<{ id: string; name: string; description: string }[] | null> {
  const hintClause = extractionHint
    ? `Extraction guidance: ${extractionHint}\n`
    : '';

  const extractionPrompt = `${hintClause}Extract all distinct items from this markdown output as JSON.\nReturn ONLY valid JSON: {"items": [{"id": "1", "name": "short name", "description": "1-sentence description"}]}\n\nContent:\n${aiOutput}`;

  const parsed = await extractJsonFromText(client, extractionPrompt);
  if (!parsed?.items || !Array.isArray(parsed.items)) return null;
  return parsed.items as { id: string; name: string; description: string }[];
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

  // 2. Previous AI step outputs + interaction results (based on contextSlideIds or all prior)
  const INTERACTIVE_TYPES = ['evaluation', 'rating', 'poll', 'thoughts', 'quiz'];
  const defaultContextSlides = slides
    .filter(s => s.order < currentSlide.order && s.elements.some(el =>
      el.type === 'ai-step' || INTERACTIVE_TYPES.includes(el.type)
    ))
    .sort((a, b) => a.order - b.order);

  const contextSlideIds = config.contextSlideIds && config.contextSlideIds.length > 0
    ? config.contextSlideIds
    : defaultContextSlides.map(s => s.id);

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

/**
 * Compose the full prompt for the AI step
 */
function composePrompt(
  targetContext: string,
  contextString: string,
  nudgeSummary: string,
  currentOutput: string,
  stepPrompt: string,
  sanitizedNudge?: string
): string {
  return `${targetContext}

RELEVANT CONTEXT:
${contextString}
${nudgeSummary}

${currentOutput ? `CURRENT STATE:\n${currentOutput}\n` : ''}
TASK:
${stepPrompt}

${sanitizedNudge ? `HOST REFINEMENT REQUEST: "${sanitizedNudge}"` : 'Generate a fresh, high-quality response for the task based on the context above.'}

INSTRUCTIONS:
1. If a refinement request is provided, update the current state accordingly.
2. If no refinement is provided, generate the initial output for this step.
3. Use professional, well-structured language.
4. Output ONLY the markdown content. No conversational filler.`;
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
      if (gameDoc.data()?.hostId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Only the game host can run AI steps');
      }

      // Load presentation
      const presDoc = await db.collection('presentations').doc(data.presentationId).get();
      if (!presDoc.exists) {
        throw new HttpsError('not-found', 'Presentation not found');
      }
      const presData = presDoc.data();
      const slides = (presData?.slides || []) as PresentationSlide[];
      const settings = (presData?.settings || {}) as PresentationSettings;

      // Find target slide and ai-step element
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

      // Compose prompt
      const systemPrompt = settings.workflowConfig?.systemPrompt
        || 'You are a helpful AI assistant. Provide clear, well-structured markdown output.';
      const targetContext = settings.workflowConfig?.target
        ? `\nTarget/Subject: ${sanitizeInput(settings.workflowConfig.target)}`
        : '';
      const currentOutput = slideOutputs[data.slideId]?.aiOutput || '';
      const sanitizedNudge = data.nudge ? sanitizeInput(data.nudge) : undefined;

      const fullPrompt = composePrompt(
        targetContext, contextString, nudgeSummary,
        currentOutput, config.stepPrompt, sanitizedNudge
      );

      // Select model and call Gemini
      const isComplexTask = contextString.length > 10000 || (data.nudge && data.nudge.length > 200);
      const model = isComplexTask ? GEMINI_PRO : GEMINI_FLASH;
      const useSearch = !!config.enableGoogleSearch && !data.nudge;

      const client = createGeminiClient();
      const aiOutput = await callGeminiWithRetry(client, model, systemPrompt, fullPrompt, useSearch);

      // Image generation (if enabled)
      let imageUrl: string | undefined;
      if (config.enableImageGeneration) {
        try {
          const storagePath = `ai-step/${data.gameId}/${data.slideId}/output.png`;
          imageUrl = await generateAndUploadImage(client, aiOutput, storagePath);
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

      throwClassifiedError(error, 'run AI step');
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
      if (gameDoc.data()?.hostId !== request.auth.uid) {
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

      const client = createGeminiClient();

      const suggestionsText = nudges
        .map(n => `- ${sanitizeInput(n.playerName)}: "${sanitizeInput(n.text)}"`)
        .join('\n');

      const prompt = `Given these audience suggestions, synthesize them into a single, coherent refinement request that captures the key themes and specific guidance. Be concise (1-3 sentences).

Suggestions:
${suggestionsText}

Output ONLY the synthesized request.`;

      const response = await client.models.generateContent({
        model: GEMINI_FLASH,
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
      throwClassifiedError(error, 'summarize nudges');
    }
  }
);
