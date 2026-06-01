import { nanoid } from 'nanoid';
import type { Canvas, Frame } from '../types/canvas';
import { FRAME_WIDTH, FRAME_HEIGHT, FRAME_GAP, DEFAULT_SEQUENCE_ID } from '../types/canvas';
import type { SlideBackground, SlideElement, SlideElementType } from '../types/presentation';
import { INTERACTIVE_ELEMENT_TYPES } from '../types/presentation';
import { computeAnchorPosition, computeConnectorBoundingBox } from './connector-paths';

/** A fresh canvas with a single empty frame and a default sequence. */
export function createDefaultCanvas(): Canvas {
  const id = nanoid();
  return {
    frames: [
      {
        id,
        name: 'Frame 1',
        canvasX: 0,
        canvasY: 0,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        elements: [],
        background: { type: 'solid', color: '#ffffff' },
        transition: 'fade',
      },
    ],
    sequences: [{ id: DEFAULT_SEQUENCE_ID, name: 'Main', frameIds: [id] }],
    defaultSequenceId: DEFAULT_SEQUENCE_ID,
  };
}

/** Map a single frame by id, returning a new Canvas. */
function mapFrame(canvas: Canvas, frameId: string, fn: (frame: Frame) => Frame): Canvas {
  return { ...canvas, frames: canvas.frames.map((f) => (f.id === frameId ? fn(f) : f)) };
}

/** Insert frameId into the default sequence, optionally right after another frame. */
function insertIntoDefaultSequence(canvas: Canvas, frameId: string, afterFrameId?: string): Canvas['sequences'] {
  return canvas.sequences.map((seq) => {
    if (seq.id !== canvas.defaultSequenceId) return seq;
    const ids = [...seq.frameIds];
    if (afterFrameId) {
      const i = ids.indexOf(afterFrameId);
      if (i >= 0) ids.splice(i + 1, 0, frameId);
      else ids.push(frameId);
    } else {
      ids.push(frameId);
    }
    return { ...seq, frameIds: ids };
  });
}

/** Add a new empty frame to the right of the rightmost frame; append to the default sequence. */
export function addFrame(canvas: Canvas, opts?: { afterFrameId?: string }): { canvas: Canvas; frameId: string } {
  const id = nanoid();
  const maxRight = canvas.frames.reduce((m, f) => Math.max(m, f.canvasX + f.width), 0);
  const canvasX = canvas.frames.length ? maxRight + FRAME_GAP : 0;
  const frame: Frame = {
    id,
    name: `Frame ${canvas.frames.length + 1}`,
    canvasX,
    canvasY: 0,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    elements: [],
    background: { type: 'solid', color: '#ffffff' },
    transition: 'fade',
  };
  return {
    canvas: {
      ...canvas,
      frames: [...canvas.frames, frame],
      sequences: insertIntoDefaultSequence(canvas, id, opts?.afterFrameId),
    },
    frameId: id,
  };
}

/** Deep-clone a frame (fresh ids), offset its position, insert after the source in the default sequence. */
export function duplicateFrame(canvas: Canvas, frameId: string): { canvas: Canvas; frameId: string } {
  const source = canvas.frames.find((f) => f.id === frameId);
  if (!source) return { canvas, frameId };
  const id = nanoid();
  const clone: Frame = JSON.parse(JSON.stringify(source));
  clone.id = id;
  clone.name = `${source.name} copy`;
  clone.canvasX = source.canvasX + FRAME_GAP / 2;
  clone.canvasY = source.canvasY + FRAME_GAP / 2;
  clone.elements = clone.elements.map((el) => ({ ...el, id: nanoid() }));
  return {
    canvas: {
      ...canvas,
      frames: [...canvas.frames, clone],
      sequences: insertIntoDefaultSequence(canvas, id, frameId),
    },
    frameId: id,
  };
}

/** Remove a frame (and all its sequence references). Never removes the last frame. */
export function deleteFrame(canvas: Canvas, frameId: string): Canvas {
  if (canvas.frames.length <= 1) return canvas;
  return {
    ...canvas,
    frames: canvas.frames.filter((f) => f.id !== frameId),
    sequences: canvas.sequences.map((seq) => ({
      ...seq,
      frameIds: seq.frameIds.filter((fid) => fid !== frameId),
    })),
  };
}

/** Set a frame's absolute canvas position. */
export function moveFrame(canvas: Canvas, frameId: string, canvasX: number, canvasY: number): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, canvasX, canvasY }));
}

export function renameFrame(canvas: Canvas, frameId: string, name: string): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, name }));
}

export function updateFrameBackground(canvas: Canvas, frameId: string, background: SlideBackground): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, background }));
}

export function updateFrameNotes(canvas: Canvas, frameId: string, notes: string): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, notes }));
}

export function updateFrameTransition(canvas: Canvas, frameId: string, transition: Frame['transition']): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, transition }));
}

/** Reorder a sequence's frameIds (default sequence in this plan). Positions are untouched. */
export function reorderSequence(canvas: Canvas, sequenceId: string, fromIndex: number, toIndex: number): Canvas {
  return {
    ...canvas,
    sequences: canvas.sequences.map((seq) => {
      if (seq.id !== sequenceId) return seq;
      const ids = [...seq.frameIds];
      if (fromIndex < 0 || fromIndex >= ids.length) return seq;
      const [moved] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, moved);
      return { ...seq, frameIds: ids };
    }),
  };
}

/** Apply a transform to a frame's elements, returning a new Canvas. */
function withFrameElements(
  canvas: Canvas,
  frameId: string,
  fn: (elements: SlideElement[]) => SlideElement[]
): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, elements: fn(f.elements) }));
}

/** Recompute endpoints/bounding boxes of connectors attached to a moved/resized element. */
function updateAttachedConnectors(elements: SlideElement[], movedElementId: string): SlideElement[] {
  const movedEl = elements.find((el) => el.id === movedElementId);
  if (!movedEl) return elements;
  return elements.map((el) => {
    if (el.type !== 'connector' || !el.connectorConfig) return el;
    const cfg = el.connectorConfig;
    let changed = false;
    const newCfg = { ...cfg };
    if (cfg.startAttachment?.elementId === movedElementId) {
      const pos = computeAnchorPosition(movedEl, cfg.startAttachment.anchor);
      newCfg.startX = pos.x;
      newCfg.startY = pos.y;
      changed = true;
    }
    if (cfg.endAttachment?.elementId === movedElementId) {
      const pos = computeAnchorPosition(movedEl, cfg.endAttachment.anchor);
      newCfg.endX = pos.x;
      newCfg.endY = pos.y;
      changed = true;
    }
    if (!changed) return el;
    const bbox = computeConnectorBoundingBox(newCfg.startX, newCfg.startY, newCfg.endX, newCfg.endY);
    return { ...el, connectorConfig: newCfg, x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  });
}

/** Remove attachments referencing a deleted element (keep the connectors). */
function detachConnectorsFromElement(elements: SlideElement[], deletedElementId: string): SlideElement[] {
  return elements.map((el) => {
    if (el.type !== 'connector' || !el.connectorConfig) return el;
    const cfg = el.connectorConfig;
    const startAttached = cfg.startAttachment?.elementId === deletedElementId;
    const endAttached = cfg.endAttachment?.elementId === deletedElementId;
    if (!startAttached && !endAttached) return el;
    return {
      ...el,
      connectorConfig: {
        ...cfg,
        startAttachment: startAttached ? undefined : cfg.startAttachment,
        endAttachment: endAttached ? undefined : cfg.endAttachment,
      },
    };
  });
}

const ELEMENT_DEFAULTS: Partial<Record<SlideElementType, Partial<SlideElement>>> = {
  text: { x: 10, y: 10, width: 80, height: 10 },
  image: { x: 10, y: 10, width: 40, height: 40 },
  shape: { x: 20, y: 20, width: 30, height: 30 },
  quiz: { x: 10, y: 20, width: 80, height: 60 },
  poll: { x: 10, y: 20, width: 80, height: 60 },
  thoughts: { x: 10, y: 20, width: 80, height: 60 },
  rating: { x: 10, y: 20, width: 80, height: 60 },
  'quiz-results': { x: 10, y: 10, width: 80, height: 70 },
  'poll-results': { x: 10, y: 10, width: 80, height: 70 },
  'thoughts-results': { x: 10, y: 10, width: 80, height: 70 },
  'rating-results': { x: 10, y: 10, width: 80, height: 70 },
  evaluation: { x: 5, y: 10, width: 90, height: 75 },
  'evaluation-results': { x: 5, y: 5, width: 90, height: 85 },
  'agentic-designer': { x: 2, y: 5, width: 96, height: 90 },
  'agentic-designer-results': { x: 5, y: 5, width: 90, height: 85 },
  'ai-step': { x: 2, y: 5, width: 96, height: 90 },
  'ai-step-results': { x: 5, y: 5, width: 90, height: 85 },
  leaderboard: { x: 10, y: 5, width: 80, height: 90 },
  qa: { x: 10, y: 10, width: 80, height: 70 },
  'spin-wheel': { x: 20, y: 10, width: 60, height: 80 },
  connector: { x: 19, y: 39, width: 62, height: 22 },
};

/** Build the type-specific config block for a new element. */
function defaultConfigFor(type: SlideElementType): Partial<SlideElement> {
  switch (type) {
    case 'text':
      return { content: '', fontSize: 24, textAlign: 'center', color: '#000000' };
    case 'shape':
      return { shapeType: 'rectangle', backgroundColor: '#e2e8f0', borderColor: '#94a3b8', borderWidth: 2 };
    case 'quiz':
      return {
        quizConfig: {
          question: 'Enter your question',
          answers: [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }],
          correctAnswerIndex: 0,
          timeLimit: 20,
          pointValue: 1000,
        },
      };
    case 'poll':
      return { pollConfig: { question: 'Enter your question', options: [{ text: 'Option A' }, { text: 'Option B' }], allowMultiple: false } };
    case 'thoughts':
      return { thoughtsConfig: { prompt: 'Share your thoughts...', maxPerPlayer: 3 } };
    case 'rating':
      return { ratingConfig: { itemTitle: 'Rate this item', metricType: 'stars', min: 1, max: 5, items: [] } };
    case 'evaluation':
      return {
        evaluationConfig: {
          title: 'Evaluate items',
          items: [
            { id: nanoid(), text: 'Item 1' },
            { id: nanoid(), text: 'Item 2' },
          ],
          metrics: [{ id: nanoid(), name: 'Rating', scaleType: 'stars', scaleMin: 1, scaleMax: 5, weight: 1, lowerIsBetter: false }],
        },
      };
    case 'agentic-designer':
      return { agenticDesignerConfig: { target: 'Enter target industry or customer...', enablePlayerNudges: true } };
    case 'ai-step':
      return { aiStepConfig: { stepPrompt: '', enablePlayerNudges: true } };
    case 'leaderboard':
      return { leaderboardConfig: { maxDisplay: 10, showScores: true } };
    case 'qa':
      return { qaConfig: { moderationEnabled: false } };
    case 'spin-wheel':
      return { spinWheelConfig: { mode: 'players' } };
    case 'connector':
      return {
        connectorConfig: {
          routingType: 'straight',
          startX: 20,
          startY: 50,
          endX: 80,
          endY: 50,
          startArrow: 'none',
          endArrow: 'arrow',
          strokeColor: '#64748b',
          strokeWidth: 2,
          strokeStyle: 'solid',
        },
      };
    default:
      return {};
  }
}

/** Add an element to a frame. Returns the new element id, or null if rejected (interactive limit). */
export function addElement(
  canvas: Canvas,
  frameId: string,
  type: SlideElementType,
  overrides?: Partial<SlideElement>
): { canvas: Canvas; elementId: string | null } {
  const frame = canvas.frames.find((f) => f.id === frameId);
  if (!frame) return { canvas, elementId: null };
  if (INTERACTIVE_ELEMENT_TYPES.includes(type) && frame.elements.some((el) => INTERACTIVE_ELEMENT_TYPES.includes(el.type))) {
    return { canvas, elementId: null };
  }
  const maxZ = frame.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
  const newElement: SlideElement = {
    id: nanoid(),
    type,
    x: 10,
    y: 10,
    width: 40,
    height: 30,
    zIndex: maxZ + 1,
    ...ELEMENT_DEFAULTS[type],
    ...defaultConfigFor(type),
    ...overrides,
  };
  if (newElement.type === 'connector' && newElement.connectorConfig) {
    const cfg = newElement.connectorConfig;
    const bbox = computeConnectorBoundingBox(cfg.startX, cfg.startY, cfg.endX, cfg.endY);
    newElement.x = bbox.x;
    newElement.y = bbox.y;
    newElement.width = bbox.width;
    newElement.height = bbox.height;
  }
  return {
    canvas: withFrameElements(canvas, frameId, (els) => [...els, newElement]),
    elementId: newElement.id,
  };
}

/** Update one element in a frame; recompute attached connectors when geometry changes. */
export function updateElement(canvas: Canvas, frameId: string, elementId: string, updates: Partial<SlideElement>): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    let next = elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el));
    const moved = next.find((el) => el.id === elementId);
    if (moved && moved.type !== 'connector' && ('x' in updates || 'y' in updates || 'width' in updates || 'height' in updates)) {
      next = updateAttachedConnectors(next, elementId);
    }
    return next;
  });
}

/** Update many elements with the same patch. */
export function updateElements(canvas: Canvas, frameId: string, elementIds: string[], updates: Partial<SlideElement>): Canvas {
  return withFrameElements(canvas, frameId, (elements) =>
    elements.map((el) => (elementIds.includes(el.id) ? { ...el, ...updates } : el))
  );
}

/** Delete one element and detach any connectors that referenced it. */
export function deleteElement(canvas: Canvas, frameId: string, elementId: string): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    const remaining = elements.filter((el) => el.id !== elementId);
    return detachConnectorsFromElement(remaining, elementId);
  });
}

/** Delete many elements and detach connectors referencing any of them. */
export function deleteElements(canvas: Canvas, frameId: string, elementIds: string[]): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    let remaining = elements.filter((el) => !elementIds.includes(el.id));
    for (const id of elementIds) remaining = detachConnectorsFromElement(remaining, id);
    return remaining;
  });
}
