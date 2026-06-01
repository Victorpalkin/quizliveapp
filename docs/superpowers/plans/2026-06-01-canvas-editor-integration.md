# Canvas Editor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the presentation editor canvas-native — the `Canvas` becomes the editor's source of truth (loaded via `getCanvas`, dual-written as `canvas`+`slides`), the editor opens on the spatial overview (read-only `InfiniteCanvas`) and double-click enters single-frame editing, with a sequence-aware Frames panel.

**Architecture:** A pure, node-tested `canvas-ops` module holds all Canvas mutation logic (frame/sequence ops + per-frame element ops ported from the slide editor). A thin `use-canvas-state` hook wraps it with React state + undo/redo and exposes **`PresentationSlide` adapter views** (`currentSlideView`, `slidesView`) so the existing `SlideCanvas`/`PropertiesPanel` and their sub-components stay unchanged. `PresentationEditor` switches to the hook, adds overview/edit modes, swaps `SlidePanel`→`FramesPanel`, and dual-writes persistence. `use-editor-state` and `SlidePanel` are removed.

**Tech Stack:** TypeScript, Vitest (node), React 19 / Next 15, nanoid, `@use-gesture/react` (already added), Tailwind, lucide-react, `@dnd-kit` (already used by the panel).

**Spec:** `docs/superpowers/specs/2026-06-01-canvas-editor-integration-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/firebase/presentation/use-presentation.ts` (modify) | Load `canvas` in `docToPresentation`; allow writing `canvas` in `updatePresentation` |
| `src/lib/utils/canvas-ops.ts` (create) | Pure Canvas operations: frame/sequence ops + per-frame element ops |
| `src/lib/utils/canvas-ops.test.ts` (create) | Node unit tests for `canvas-ops` |
| `src/hooks/presentation/use-canvas-state.ts` (create) | Thin editor-state hook over `canvas-ops`; exposes adapter views |
| `src/components/app/presentation/editor/InfiniteCanvas.tsx` (modify) | Opt-in editing props (select / activate / move frame); read-only by default |
| `src/components/app/presentation/editor/FramesPanel.tsx` (create) | Sequence-ordered frame thumbnails (reuses `SlideThumbnail`) |
| `src/components/app/presentation/editor/PresentationEditor.tsx` (modify) | Switch to `use-canvas-state`; overview/edit modes; dual-write; wire panels |
| `src/hooks/presentation/use-editor-state.ts` (delete) | Dead after switch |
| `src/components/app/presentation/editor/SlidePanel.tsx` (delete) | Replaced by `FramesPanel` |

**Testing note:** `canvas-ops` (the logic) is node-tested. The hook + components are verified by `npm run typecheck` + `npm run build` (consistent with plan #1). Plan-#1 and foundation tests must stay green.

---

## Task 1: Persistence — load & write the `canvas` field

**Files:**
- Modify: `src/firebase/presentation/use-presentation.ts`

- [ ] **Step 1: Import `Canvas` and load it in `docToPresentation`**

In `src/firebase/presentation/use-presentation.ts`, add `Canvas` to the type import:
```typescript
import type {
  Presentation,
  PresentationSlide,
  PresentationSettings,
  PresentationTheme,
} from '@/lib/types';
import type { Canvas } from '@/lib/types/canvas';
```

Then in `docToPresentation`, add the `canvas` field to the returned object (right after the `slides` line):
```typescript
    slides: (data.slides as PresentationSlide[]) || [],
    canvas: data.canvas as Canvas | undefined,
```

- [ ] **Step 2: Allow writing `canvas` in `updatePresentation`**

Change the `updatePresentation` signature's `data` type to include `canvas`:
```typescript
  const updatePresentation = useCallback(
    async (id: string, data: Partial<Pick<Presentation, 'title' | 'description' | 'slides' | 'canvas' | 'settings' | 'theme'>>) => {
      if (!firestore) throw new Error('Firestore not initialized');

      await updateDoc(doc(firestore, 'presentations', id), removeUndefined({
        ...data,
        updatedAt: serverTimestamp(),
      }));
    },
    [firestore]
  );
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors (`Presentation.canvas` already exists from the foundation).

- [ ] **Step 4: Commit**

```bash
git add src/firebase/presentation/use-presentation.ts
git commit -m "feat: load and persist the presentation canvas field"
```

---

## Task 2: `canvas-ops` — frame & sequence operations (TDD)

**Files:**
- Create: `src/lib/utils/canvas-ops.ts`
- Test: `src/lib/utils/canvas-ops.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/canvas-ops.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  createDefaultCanvas,
  addFrame,
  duplicateFrame,
  deleteFrame,
  moveFrame,
  renameFrame,
  reorderSequence,
} from './canvas-ops';
import { FRAME_WIDTH, FRAME_GAP, DEFAULT_SEQUENCE_ID } from '../types/canvas';

describe('createDefaultCanvas', () => {
  it('has one frame referenced by the default sequence', () => {
    const c = createDefaultCanvas();
    expect(c.frames).toHaveLength(1);
    expect(c.defaultSequenceId).toBe(DEFAULT_SEQUENCE_ID);
    expect(c.sequences[0].frameIds).toEqual([c.frames[0].id]);
  });
});

describe('addFrame', () => {
  it('appends a frame to the right and into the default sequence', () => {
    const c0 = createDefaultCanvas();
    const x0 = c0.frames[0];
    const { canvas, frameId } = addFrame(c0);
    expect(canvas.frames).toHaveLength(2);
    const added = canvas.frames.find((f) => f.id === frameId)!;
    expect(added.canvasX).toBe(x0.canvasX + x0.width + FRAME_GAP);
    expect(canvas.sequences[0].frameIds).toEqual([x0.id, frameId]);
  });
});

describe('duplicateFrame', () => {
  it('clones the frame with fresh ids and inserts after the source in the sequence', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas; // 2 frames: A, B
    const sourceId = c.frames[0].id;
    const { canvas, frameId } = duplicateFrame(c, sourceId);
    expect(canvas.frames).toHaveLength(3);
    expect(frameId).not.toBe(sourceId);
    // inserted right after source in the sequence
    expect(canvas.sequences[0].frameIds[1]).toBe(frameId);
  });
});

describe('deleteFrame', () => {
  it('removes the frame and its sequence references', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas;
    const removeId = c.frames[1].id;
    const canvas = deleteFrame(c, removeId);
    expect(canvas.frames.some((f) => f.id === removeId)).toBe(false);
    expect(canvas.sequences[0].frameIds).not.toContain(removeId);
  });

  it('never deletes the last remaining frame', () => {
    const c = createDefaultCanvas();
    const canvas = deleteFrame(c, c.frames[0].id);
    expect(canvas.frames).toHaveLength(1);
  });
});

describe('moveFrame', () => {
  it('sets absolute canvas position', () => {
    const c = createDefaultCanvas();
    const canvas = moveFrame(c, c.frames[0].id, 500, 300);
    expect(canvas.frames[0].canvasX).toBe(500);
    expect(canvas.frames[0].canvasY).toBe(300);
  });
});

describe('renameFrame', () => {
  it('renames a frame', () => {
    const c = createDefaultCanvas();
    const canvas = renameFrame(c, c.frames[0].id, 'Intro');
    expect(canvas.frames[0].name).toBe('Intro');
  });
});

describe('reorderSequence', () => {
  it('reorders frameIds without touching positions', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas; // A, B
    const [a, b] = c.sequences[0].frameIds;
    const posA = c.frames.find((f) => f.id === a)!.canvasX;
    const canvas = reorderSequence(c, DEFAULT_SEQUENCE_ID, 0, 1);
    expect(canvas.sequences[0].frameIds).toEqual([b, a]);
    expect(canvas.frames.find((f) => f.id === a)!.canvasX).toBe(posA); // unchanged
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module `./canvas-ops` cannot be resolved.

- [ ] **Step 3: Implement frame & sequence ops**

Create `src/lib/utils/canvas-ops.ts`:
```typescript
import { nanoid } from 'nanoid';
import type { Canvas, Frame } from '../types/canvas';
import { FRAME_WIDTH, FRAME_HEIGHT, FRAME_GAP, DEFAULT_SEQUENCE_ID } from '../types/canvas';
import type { SlideBackground } from '../types/presentation';

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvas-ops` frame/sequence tests green; existing suites stay green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-ops.ts src/lib/utils/canvas-ops.test.ts
git commit -m "feat: add canvas-ops frame and sequence operations"
```

---

## Task 3: `canvas-ops` — element CRUD + connectors (TDD)

**Files:**
- Modify: `src/lib/utils/canvas-ops.ts`
- Test: `src/lib/utils/canvas-ops.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/utils/canvas-ops.test.ts`. First add `addElement`, `updateElement`, `deleteElement` to the existing import from `./canvas-ops`. Then append:
```typescript
describe('addElement', () => {
  it('adds an element to the target frame and returns its id', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text');
    expect(elementId).toBeTruthy();
    expect(canvas.frames[0].elements).toHaveLength(1);
    expect(canvas.frames[0].elements[0].type).toBe('text');
  });

  it('rejects a second interactive element in the same frame', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const after = addElement(c, fid, 'quiz').canvas;
    const { canvas, elementId } = addElement(after, fid, 'poll');
    expect(elementId).toBeNull();
    expect(canvas.frames[0].elements).toHaveLength(1); // unchanged
  });
});

describe('updateElement', () => {
  it('updates an element in the target frame', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text');
    const next = updateElement(canvas, fid, elementId!, { x: 42 });
    expect(next.frames[0].elements[0].x).toBe(42);
  });
});

describe('deleteElement', () => {
  it('removes an element from the target frame', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text');
    const next = deleteElement(canvas, fid, elementId!);
    expect(next.frames[0].elements).toHaveLength(0);
  });

  it('detaches connectors attached to a deleted element', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const withText = addElement(c, fid, 'text');
    const textId = withText.elementId!;
    // add a connector, then attach its start to the text element
    const withConn = addElement(withText.canvas, fid, 'connector');
    const connId = withConn.elementId!;
    const attached = updateElement(withConn.canvas, fid, connId, {
      connectorConfig: {
        ...withConn.canvas.frames[0].elements.find((e) => e.id === connId)!.connectorConfig!,
        startAttachment: { elementId: textId, anchor: 'right' },
      },
    });
    const afterDelete = deleteElement(attached, fid, textId);
    const conn = afterDelete.frames[0].elements.find((e) => e.id === connId)!;
    expect(conn.connectorConfig!.startAttachment).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `addElement` / `updateElement` / `deleteElement` not exported.

- [ ] **Step 3: Implement element CRUD + connector helpers**

Append to `src/lib/utils/canvas-ops.ts`. First extend the imports at the top of the file:
```typescript
import type { SlideBackground, SlideElement, SlideElementType } from '../types/presentation';
import { INTERACTIVE_ELEMENT_TYPES } from '../types/presentation';
import { computeAnchorPosition, computeConnectorBoundingBox } from './connector-paths';
```
(Replace the existing `import type { SlideBackground } from '../types/presentation';` line with the first line above; add the two `import` lines.)

Then append:
```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — element CRUD tests green; existing suites stay green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-ops.ts src/lib/utils/canvas-ops.test.ts
git commit -m "feat: add canvas-ops element CRUD with connector handling"
```

---

## Task 4: `canvas-ops` — z-order, align, clipboard (TDD)

**Files:**
- Modify: `src/lib/utils/canvas-ops.ts`
- Test: `src/lib/utils/canvas-ops.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/utils/canvas-ops.test.ts`. Add `bringToFront`, `alignElement`, `duplicateElement`, `pasteElement` to the import from `./canvas-ops`, and add a new import `import { canvasToSlides } from './canvas-migration';` at the top. Then append:
```typescript
describe('bringToFront', () => {
  it('raises selected elements above the rest', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const a = addElement(c, fid, 'text');
    const b = addElement(a.canvas, fid, 'shape');
    const next = bringToFront(b.canvas, fid, [a.elementId!]);
    const els = next.frames[0].elements;
    const za = els.find((e) => e.id === a.elementId)!.zIndex;
    const zb = els.find((e) => e.id === b.elementId)!.zIndex;
    expect(za).toBeGreaterThan(zb);
  });
});

describe('alignElement', () => {
  it('aligns an element to the left edge', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text', { x: 30, width: 40 });
    const next = alignElement(canvas, fid, elementId!, 'left');
    expect(next.frames[0].elements[0].x).toBe(0);
  });

  it('centers an element horizontally', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text', { x: 0, width: 40 });
    const next = alignElement(canvas, fid, elementId!, 'center-h');
    expect(next.frames[0].elements[0].x).toBe(30); // (100-40)/2
  });
});

describe('duplicateElement / pasteElement', () => {
  it('duplicates an element with a fresh id and offset', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text', { x: 10, y: 10 });
    const { canvas: next, elementId: dupId } = duplicateElement(canvas, fid, elementId!);
    expect(dupId).not.toBe(elementId);
    expect(next.frames[0].elements).toHaveLength(2);
    const dup = next.frames[0].elements.find((e) => e.id === dupId)!;
    expect(dup.x).toBe(13);
    expect(dup.y).toBe(13);
  });

  it('pastes a clipboard element into a frame', () => {
    const c = createDefaultCanvas();
    const fid = c.frames[0].id;
    const { canvas, elementId } = addElement(c, fid, 'text');
    const clip = canvas.frames[0].elements.find((e) => e.id === elementId)!;
    const { canvas: next, elementId: pastedId } = pasteElement(canvas, fid, clip);
    expect(pastedId).toBeTruthy();
    expect(next.frames[0].elements).toHaveLength(2);
  });
});

describe('canvasToSlides stays consistent after edits', () => {
  it('reflects sequence order and frame contents (dual-write source)', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas; // A, B
    const fidA = c.frames[0].id;
    c = addElement(c, fidA, 'text').canvas;
    // reverse navigation order: B then A
    c = reorderSequence(c, c.defaultSequenceId, 0, 1);
    const slides = canvasToSlides(c);
    // slides follow the (reordered) sequence; ids match frame ids; orders are 0..n-1
    expect(slides.map((s) => s.id)).toEqual(c.sequences[0].frameIds);
    expect(slides.map((s) => s.order)).toEqual([0, 1]);
    // the frame's edited elements survive the conversion
    const slideA = slides.find((s) => s.id === fidA)!;
    expect(slideA.elements).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `bringToFront` / `alignElement` / `duplicateElement` / `pasteElement` not exported.

- [ ] **Step 3: Implement z-order, align, clipboard**

Append to `src/lib/utils/canvas-ops.ts`:
```typescript
export function bringToFront(canvas: Canvas, frameId: string, elementIds: string[]): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    if (elementIds.length === 0) return elements;
    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    let nextZ = maxZ + 1;
    return elements.map((el) => (elementIds.includes(el.id) ? { ...el, zIndex: nextZ++ } : el));
  });
}

export function sendToBack(canvas: Canvas, frameId: string, elementIds: string[]): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    if (elementIds.length === 0) return elements;
    const minZ = elements.reduce((min, el) => Math.min(min, el.zIndex), Infinity);
    let nextZ = minZ - elementIds.length;
    return elements.map((el) => (elementIds.includes(el.id) ? { ...el, zIndex: nextZ++ } : el));
  });
}

function swapZ(elements: SlideElement[], elementId: string, dir: 1 | -1): SlideElement[] {
  const el = elements.find((e) => e.id === elementId);
  if (!el) return elements;
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const idx = sorted.findIndex((e) => e.id === elementId);
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= sorted.length) return elements;
  const target = sorted[targetIdx];
  return elements.map((e) => {
    if (e.id === el.id) return { ...e, zIndex: target.zIndex };
    if (e.id === target.id) return { ...e, zIndex: el.zIndex };
    return e;
  });
}

export function moveForward(canvas: Canvas, frameId: string, elementId: string): Canvas {
  return withFrameElements(canvas, frameId, (els) => swapZ(els, elementId, 1));
}

export function moveBackward(canvas: Canvas, frameId: string, elementId: string): Canvas {
  return withFrameElements(canvas, frameId, (els) => swapZ(els, elementId, -1));
}

export function alignElement(
  canvas: Canvas,
  frameId: string,
  elementId: string,
  alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'
): Canvas {
  return withFrameElements(canvas, frameId, (elements) => {
    const el = elements.find((e) => e.id === elementId);
    if (!el) return elements;
    const updates: Partial<SlideElement> = {};
    switch (alignment) {
      case 'left': updates.x = 0; break;
      case 'center-h': updates.x = (100 - el.width) / 2; break;
      case 'right': updates.x = 100 - el.width; break;
      case 'top': updates.y = 0; break;
      case 'center-v': updates.y = (100 - el.height) / 2; break;
      case 'bottom': updates.y = 100 - el.height; break;
    }
    return elements.map((e) => (e.id === elementId ? { ...e, ...updates } : e));
  });
}

/** Place a copy of `source` into a frame (offset, fresh id). Honors the interactive-per-frame limit. */
export function pasteElement(canvas: Canvas, frameId: string, source: SlideElement): { canvas: Canvas; elementId: string | null } {
  const frame = canvas.frames.find((f) => f.id === frameId);
  if (!frame) return { canvas, elementId: null };
  if (INTERACTIVE_ELEMENT_TYPES.includes(source.type) && frame.elements.some((el) => INTERACTIVE_ELEMENT_TYPES.includes(el.type))) {
    return { canvas, elementId: null };
  }
  const maxZ = frame.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
  const pasted: SlideElement = {
    ...JSON.parse(JSON.stringify(source)),
    id: nanoid(),
    x: Math.min((source.x || 0) + 3, 90),
    y: Math.min((source.y || 0) + 3, 90),
    zIndex: maxZ + 1,
  };
  return { canvas: withFrameElements(canvas, frameId, (els) => [...els, pasted]), elementId: pasted.id };
}

/** Duplicate an element within its frame (offset, fresh id). */
export function duplicateElement(canvas: Canvas, frameId: string, elementId: string): { canvas: Canvas; elementId: string | null } {
  const frame = canvas.frames.find((f) => f.id === frameId);
  const el = frame?.elements.find((e) => e.id === elementId);
  if (!frame || !el) return { canvas, elementId: null };
  return pasteElement(canvas, frameId, el);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — z-order/align/clipboard tests green; existing suites stay green.

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/canvas-ops.ts src/lib/utils/canvas-ops.test.ts
git commit -m "feat: add canvas-ops z-order, align, and clipboard operations"
```

---

## Task 5: `use-canvas-state` hook

**Files:**
- Create: `src/hooks/presentation/use-canvas-state.ts`

This hook holds editor state over a `Canvas`, delegates mutations to `canvas-ops`, manages undo/redo + selection + mode, and exposes `PresentationSlide` adapter views so the existing `SlideCanvas`/`PropertiesPanel` need no changes. Element operations implicitly target the current frame.

- [ ] **Step 1: Create the hook**

Create `src/hooks/presentation/use-canvas-state.ts`:
```typescript
'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  PresentationSlide,
  SlideElement,
  SlideElementType,
  SlideBackground,
  PresentationSettings,
  PresentationTheme,
} from '@/lib/types';
import { INTERACTIVE_ELEMENT_TYPES } from '@/lib/types';
import type { Canvas } from '@/lib/types/canvas';
import { canvasToSlides, slidesToCanvas } from '@/lib/utils/canvas-migration';
import * as ops from '@/lib/utils/canvas-ops';

export type EditorMode = 'overview' | 'edit';

const DEFAULT_SETTINGS: PresentationSettings = {
  enableReactions: true,
  enableQA: true,
  enableStreaks: true,
  enableSoundEffects: true,
  defaultTimerSeconds: 20,
  pacingMode: 'free',
  pacingThreshold: 80,
};

const DEFAULT_THEME: PresentationTheme = { preset: 'default' };

interface CanvasEditorState {
  canvas: Canvas;
  currentFrameId: string | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
  title: string;
  description: string;
  settings: PresentationSettings;
  theme: PresentationTheme;
  mode: EditorMode;
  isDirty: boolean;
}

export function useCanvasState(initial?: {
  canvas?: Canvas;
  title?: string;
  description?: string;
  settings?: PresentationSettings;
  theme?: PresentationTheme;
}) {
  const initialCanvas = initial?.canvas ?? ops.createDefaultCanvas();
  const [state, setState] = useState<CanvasEditorState>({
    canvas: initialCanvas,
    currentFrameId: null,
    selectedElementId: null,
    selectedElementIds: [],
    title: initial?.title || 'Untitled Presentation',
    description: initial?.description || '',
    settings: initial?.settings || { ...DEFAULT_SETTINGS },
    theme: initial?.theme || { ...DEFAULT_THEME },
    mode: 'overview',
    isDirty: false,
  });

  // Undo/redo over canvas snapshots
  const undoStackRef = useRef<Canvas[]>([]);
  const redoStackRef = useRef<Canvas[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const canvasRef = useRef(state.canvas);
  canvasRef.current = state.canvas;
  const isDraggingRef = useRef(false);
  const lastHistoryPushRef = useRef(0);
  const clipboardRef = useRef<SlideElement | null>(null);

  const pushHistory = useCallback(() => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(canvasRef.current)));
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
    lastHistoryPushRef.current = Date.now();
  }, []);

  const pushHistoryDebounced = useCallback(() => {
    const now = Date.now();
    if (now - lastHistoryPushRef.current > 300) pushHistory();
  }, [pushHistory]);

  // --- Derived views ---
  const defaultSequence = useMemo(
    () => state.canvas.sequences.find((s) => s.id === state.canvas.defaultSequenceId) ?? state.canvas.sequences[0],
    [state.canvas]
  );

  const framesInOrder = useMemo(() => {
    const byId = new Map(state.canvas.frames.map((f) => [f.id, f]));
    const ordered = (defaultSequence?.frameIds ?? []).map((id) => byId.get(id)).filter(Boolean) as Canvas['frames'];
    // append any frames not in the sequence
    for (const f of state.canvas.frames) if (!ordered.includes(f)) ordered.push(f);
    return ordered;
  }, [state.canvas, defaultSequence]);

  const currentFrame = state.canvas.frames.find((f) => f.id === state.currentFrameId) ?? null;

  const slidesView = useMemo(() => canvasToSlides(state.canvas), [state.canvas]);

  const currentSlideView: PresentationSlide | null = currentFrame
    ? {
        id: currentFrame.id,
        order: framesInOrder.findIndex((f) => f.id === currentFrame.id),
        elements: currentFrame.elements,
        background: currentFrame.background,
        notes: currentFrame.notes,
        transition: currentFrame.transition,
      }
    : null;

  const selectedElement = currentFrame?.elements.find((el) => el.id === state.selectedElementId) ?? null;
  const selectedElements = currentFrame?.elements.filter((el) => state.selectedElementIds.includes(el.id)) ?? [];

  // --- Helper: mutate the canvas (optionally pushing history first) ---
  const applyCanvas = useCallback((producer: (c: Canvas) => Canvas, opts?: { history?: 'push' | 'debounce' | 'none' }) => {
    const mode = opts?.history ?? 'push';
    if (mode === 'push') pushHistory();
    else if (mode === 'debounce' && !isDraggingRef.current) pushHistoryDebounced();
    setState((s) => ({ ...s, canvas: producer(s.canvas), isDirty: true }));
  }, [pushHistory, pushHistoryDebounced]);

  // --- Metadata ---
  const setTitle = useCallback((title: string) => setState((s) => ({ ...s, title, isDirty: true })), []);
  const setDescription = useCallback((description: string) => setState((s) => ({ ...s, description, isDirty: true })), []);

  // --- Frame navigation / mode ---
  const setCurrentFrameId = useCallback((frameId: string | null) => {
    setState((s) => ({ ...s, currentFrameId: frameId, selectedElementId: null, selectedElementIds: [] }));
  }, []);
  const enterFrame = useCallback((frameId: string) => {
    setState((s) => ({ ...s, currentFrameId: frameId, mode: 'edit', selectedElementId: null, selectedElementIds: [] }));
  }, []);
  const exitToOverview = useCallback(() => setState((s) => ({ ...s, mode: 'overview', selectedElementId: null, selectedElementIds: [] })), []);

  // --- Frame ops ---
  const addFrame = useCallback(() => {
    pushHistory();
    setState((s) => {
      const { canvas, frameId } = ops.addFrame(s.canvas, { afterFrameId: s.currentFrameId ?? undefined });
      return { ...s, canvas, currentFrameId: frameId, isDirty: true };
    });
  }, [pushHistory]);

  const duplicateFrame = useCallback((frameId: string) => {
    pushHistory();
    setState((s) => {
      const { canvas, frameId: newId } = ops.duplicateFrame(s.canvas, frameId);
      return { ...s, canvas, currentFrameId: newId, isDirty: true };
    });
  }, [pushHistory]);

  const deleteFrame = useCallback((frameId: string) => {
    pushHistory();
    setState((s) => {
      const canvas = ops.deleteFrame(s.canvas, frameId);
      const stillCurrent = canvas.frames.some((f) => f.id === s.currentFrameId);
      return { ...s, canvas, currentFrameId: stillCurrent ? s.currentFrameId : null, isDirty: true };
    });
  }, [pushHistory]);

  const moveFrame = useCallback((frameId: string, x: number, y: number) => {
    applyCanvas((c) => ops.moveFrame(c, frameId, x, y), { history: 'debounce' });
  }, [applyCanvas]);

  const reorderSequence = useCallback((fromIndex: number, toIndex: number) => {
    applyCanvas((c) => ops.reorderSequence(c, c.defaultSequenceId, fromIndex, toIndex));
  }, [applyCanvas]);

  // --- Frame property ops (slide-compatible names used by PropertiesPanel) ---
  const updateSlideBackground = useCallback((bg: SlideBackground) => {
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.updateFrameBackground(s.canvas, s.currentFrameId, bg), isDirty: true } : s));
  }, []);
  const updateSlideNotes = useCallback((notes: string) => {
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.updateFrameNotes(s.canvas, s.currentFrameId, notes), isDirty: true } : s));
  }, []);
  const updateSlideTransition = useCallback((transition: PresentationSlide['transition']) => {
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.updateFrameTransition(s.canvas, s.currentFrameId, transition), isDirty: true } : s));
  }, []);

  // --- Element ops (implicit current frame) ---
  const addElement = useCallback((type: SlideElementType, overrides?: Partial<SlideElement>) => {
    pushHistory();
    setState((s) => {
      if (!s.currentFrameId) return s;
      const { canvas, elementId } = ops.addElement(s.canvas, s.currentFrameId, type, overrides);
      if (!elementId) return s;
      return { ...s, canvas, selectedElementId: elementId, selectedElementIds: [elementId], isDirty: true };
    });
  }, [pushHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<SlideElement>) => {
    if (!isDraggingRef.current) pushHistoryDebounced();
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.updateElement(s.canvas, s.currentFrameId, elementId, updates), isDirty: true } : s));
  }, [pushHistoryDebounced]);

  const updateElements = useCallback((elementIds: string[], updates: Partial<SlideElement>) => {
    pushHistoryDebounced();
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.updateElements(s.canvas, s.currentFrameId, elementIds, updates), isDirty: true } : s));
  }, [pushHistoryDebounced]);

  const deleteElement = useCallback((elementId: string) => {
    pushHistory();
    setState((s) => {
      if (!s.currentFrameId) return s;
      return {
        ...s,
        canvas: ops.deleteElement(s.canvas, s.currentFrameId, elementId),
        selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
        selectedElementIds: s.selectedElementIds.filter((id) => id !== elementId),
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const deleteElements = useCallback((elementIds: string[]) => {
    pushHistory();
    setState((s) => {
      if (!s.currentFrameId) return s;
      return {
        ...s,
        canvas: ops.deleteElements(s.canvas, s.currentFrameId, elementIds),
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const selectElement = useCallback((elementId: string | null) => {
    setState((s) => ({ ...s, selectedElementId: elementId, selectedElementIds: elementId ? [elementId] : [] }));
  }, []);

  const toggleSelectElement = useCallback((elementId: string) => {
    setState((s) => {
      const ids = s.selectedElementIds.includes(elementId)
        ? s.selectedElementIds.filter((id) => id !== elementId)
        : [...s.selectedElementIds, elementId];
      return { ...s, selectedElementIds: ids, selectedElementId: ids.length > 0 ? ids[0] : null };
    });
  }, []);

  // --- Z-order ---
  const bringToFront = useCallback(() => {
    pushHistory();
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.bringToFront(s.canvas, s.currentFrameId, s.selectedElementIds), isDirty: true } : s));
  }, [pushHistory]);
  const sendToBack = useCallback(() => {
    pushHistory();
    setState((s) => (s.currentFrameId ? { ...s, canvas: ops.sendToBack(s.canvas, s.currentFrameId, s.selectedElementIds), isDirty: true } : s));
  }, [pushHistory]);
  const moveForward = useCallback(() => {
    pushHistory();
    setState((s) => (s.currentFrameId && s.selectedElementId ? { ...s, canvas: ops.moveForward(s.canvas, s.currentFrameId, s.selectedElementId), isDirty: true } : s));
  }, [pushHistory]);
  const moveBackward = useCallback(() => {
    pushHistory();
    setState((s) => (s.currentFrameId && s.selectedElementId ? { ...s, canvas: ops.moveBackward(s.canvas, s.currentFrameId, s.selectedElementId), isDirty: true } : s));
  }, [pushHistory]);

  // --- Align ---
  const alignElement = useCallback((alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    pushHistory();
    setState((s) => (s.currentFrameId && s.selectedElementId ? { ...s, canvas: ops.alignElement(s.canvas, s.currentFrameId, s.selectedElementId, alignment), isDirty: true } : s));
  }, [pushHistory]);

  // --- Clipboard ---
  const copyElement = useCallback(() => {
    if (!currentFrame || !state.selectedElementId) return;
    const el = currentFrame.elements.find((e) => e.id === state.selectedElementId);
    if (el) clipboardRef.current = JSON.parse(JSON.stringify(el));
  }, [currentFrame, state.selectedElementId]);

  const pasteElement = useCallback(() => {
    if (!clipboardRef.current) return;
    pushHistory();
    setState((s) => {
      if (!s.currentFrameId) return s;
      const { canvas, elementId } = ops.pasteElement(s.canvas, s.currentFrameId, clipboardRef.current!);
      if (!elementId) return s;
      return { ...s, canvas, selectedElementId: elementId, selectedElementIds: [elementId], isDirty: true };
    });
  }, [pushHistory]);

  const duplicateElement = useCallback(() => {
    if (!state.selectedElementId) return;
    pushHistory();
    setState((s) => {
      if (!s.currentFrameId || !s.selectedElementId) return s;
      const { canvas, elementId } = ops.duplicateElement(s.canvas, s.currentFrameId, s.selectedElementId);
      if (!elementId) return s;
      return { ...s, canvas, selectedElementId: elementId, selectedElementIds: [elementId], isDirty: true };
    });
  }, [state.selectedElementId, pushHistory]);

  // --- Template (slides → canvas) ---
  const applyTemplate = useCallback((data: { slides: PresentationSlide[]; settings: PresentationSettings; theme: PresentationTheme }) => {
    pushHistory();
    setState((s) => ({
      ...s,
      canvas: slidesToCanvas(data.slides),
      settings: { ...data.settings },
      theme: { ...data.theme },
      currentFrameId: null,
      selectedElementId: null,
      selectedElementIds: [],
      mode: 'overview',
      isDirty: true,
    }));
  }, [pushHistory]);

  // --- Settings/Theme ---
  const updateSettings = useCallback((settings: Partial<PresentationSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...settings }, isDirty: true }));
  }, []);
  const updateTheme = useCallback((theme: Partial<PresentationTheme>) => {
    setState((s) => ({ ...s, theme: { ...s.theme, ...theme }, isDirty: true }));
  }, []);

  // --- Undo/Redo ---
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(JSON.parse(JSON.stringify(canvasRef.current)));
    const entry = undoStackRef.current.pop()!;
    setHistoryVersion((v) => v + 1);
    setState((s) => ({ ...s, canvas: entry, selectedElementId: null, selectedElementIds: [], isDirty: true }));
  }, []);
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify(canvasRef.current)));
    const entry = redoStackRef.current.pop()!;
    setHistoryVersion((v) => v + 1);
    setState((s) => ({ ...s, canvas: entry, selectedElementId: null, selectedElementIds: [], isDirty: true }));
  }, []);
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  const markClean = useCallback(() => setState((s) => ({ ...s, isDirty: false })), []);

  // --- Drag bracketing ---
  const startDrag = useCallback(() => {
    pushHistory();
    isDraggingRef.current = true;
  }, [pushHistory]);
  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // --- Counts ---
  const interactiveElementCount = state.canvas.frames.reduce(
    (count, f) => count + f.elements.filter((el) => INTERACTIVE_ELEMENT_TYPES.includes(el.type)).length,
    0
  );
  const currentFrameHasInteractive = currentFrame?.elements.some((el) => INTERACTIVE_ELEMENT_TYPES.includes(el.type)) ?? false;

  return {
    // raw + meta
    canvas: state.canvas,
    title: state.title,
    description: state.description,
    settings: state.settings,
    theme: state.theme,
    isDirty: state.isDirty,
    mode: state.mode,

    // derived views
    framesInOrder,
    currentFrame,
    currentFrameId: state.currentFrameId,
    currentSlideView,
    slidesView,
    selectedElement,
    selectedElements,
    selectedElementId: state.selectedElementId,
    selectedElementIds: state.selectedElementIds,
    interactiveElementCount,
    currentFrameHasInteractive,
    canUndo,
    canRedo,

    // metadata setters
    setTitle,
    setDescription,

    // navigation / mode
    setCurrentFrameId,
    enterFrame,
    exitToOverview,

    // frame ops
    addFrame,
    duplicateFrame,
    deleteFrame,
    moveFrame,
    reorderSequence,

    // frame property ops (slide-named)
    updateSlideBackground,
    updateSlideNotes,
    updateSlideTransition,

    // element ops
    addElement,
    updateElement,
    updateElements,
    deleteElement,
    deleteElements,
    selectElement,
    toggleSelectElement,
    bringToFront,
    sendToBack,
    moveForward,
    moveBackward,
    alignElement,
    copyElement,
    pasteElement,
    duplicateElement,

    // template / settings / theme
    applyTemplate,
    updateSettings,
    updateTheme,

    // history / drag
    undo,
    redo,
    markClean,
    startDrag,
    endDrag,
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/presentation/use-canvas-state.ts
git commit -m "feat: add use-canvas-state hook over canvas-ops"
```

---

## Task 6: `InfiniteCanvas` — opt-in editing props

**Files:**
- Modify: `src/components/app/presentation/editor/InfiniteCanvas.tsx`

Add optional props that turn on editor affordances. When omitted, behavior is identical to plan #1 (read-only).

- [ ] **Step 1: Extend the props interface and signature**

In `src/components/app/presentation/editor/InfiniteCanvas.tsx`, replace the `InfiniteCanvasProps` interface and the function parameter list with:
```tsx
interface InfiniteCanvasProps {
  canvas: Canvas;
  sequenceId?: string;
  showMiniMap?: boolean;
  className?: string;
  /** Editor mode: id of the currently selected frame (highlighted). */
  selectedFrameId?: string | null;
  /** Editor mode: single-click selects a frame (stays in overview). When omitted, click focuses the camera (read-only nav). */
  onFrameSelect?: (frameId: string) => void;
  /** Editor mode: double-click a frame to activate (enter edit). */
  onFrameActivate?: (frameId: string) => void;
  /** Editor mode: drag a frame to reposition it (absolute canvas px). Enables drag when provided. */
  onFrameMove?: (frameId: string, canvasX: number, canvasY: number) => void;
}

export function InfiniteCanvas({
  canvas,
  sequenceId,
  showMiniMap = true,
  className,
  selectedFrameId,
  onFrameSelect,
  onFrameActivate,
  onFrameMove,
}: InfiniteCanvasProps) {
```

- [ ] **Step 2: Make each frame support select highlight, double-click activate, and drag-to-move**

Replace the frame `.map(...)` block (the `{canvas.frames.map((frame) => ( ... ))}` inside the world container) with:
```tsx
        {canvas.frames.map((frame) => {
          const handlePointerDown = onFrameMove
            ? (e: React.PointerEvent) => {
                if (e.button !== 0) return;
                e.stopPropagation(); // don't start a canvas pan
                const startClientX = e.clientX;
                const startClientY = e.clientY;
                const startX = frame.canvasX;
                const startY = frame.canvasY;
                const zoom = nav.camera.zoom;
                let moved = false;
                const onMove = (ev: PointerEvent) => {
                  const dx = (ev.clientX - startClientX) / zoom;
                  const dy = (ev.clientY - startClientY) / zoom;
                  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
                  if (moved) onFrameMove(frame.id, startX + dx, startY + dy);
                };
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }
            : undefined;
          return (
            <div
              key={frame.id}
              className={`absolute shadow-sm ${onFrameMove ? 'cursor-move' : 'cursor-pointer'} ${
                selectedFrameId === frame.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                left: frame.canvasX,
                top: frame.canvasY,
                width: frame.width,
                height: frame.height,
              }}
              onPointerDown={handlePointerDown}
              onClick={() => (onFrameSelect ? onFrameSelect(frame.id) : nav.goToFrame(frame.id))}
              onDoubleClick={() => onFrameActivate?.(frame.id)}
            >
              <FrameContent frame={frame} />
              <FrameOverlay name={frame.name} active={frame.id === (selectedFrameId ?? nav.currentFrameId)} />
            </div>
          );
        })}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS — read-only usage (no new props) compiles unchanged; editing props are optional.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/presentation/editor/InfiniteCanvas.tsx
git commit -m "feat: add opt-in editing props to InfiniteCanvas (select/activate/move)"
```

---

## Task 7: `FramesPanel` component

**Files:**
- Create: `src/components/app/presentation/editor/FramesPanel.tsx`

Sequence-ordered frame thumbnails with drag-to-reorder (sequence), badges, add/duplicate/delete, select + double-click-to-edit. Reuses `SlideThumbnail` by passing a slide-shaped view of each frame.

- [ ] **Step 1: Create the component**

Create `src/components/app/presentation/editor/FramesPanel.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Copy, Trash2, MoreHorizontal, GripVertical } from 'lucide-react';
import type { Frame } from '@/lib/types/canvas';
import type { PresentationSlide } from '@/lib/types';
import { SlideThumbnail } from '../shared/SlideThumbnail';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

/** A frame rendered through the existing slide thumbnail. */
function frameAsSlide(frame: Frame, order: number): PresentationSlide {
  return {
    id: frame.id,
    order,
    elements: frame.elements,
    background: frame.background,
    notes: frame.notes,
    transition: frame.transition,
  };
}

interface FramesPanelProps {
  frames: Frame[];
  currentFrameId: string | null;
  onSelectFrame: (frameId: string) => void;
  onEnterFrame: (frameId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  readOnly?: boolean;
}

function SortableFrameItem({
  frame,
  index,
  isActive,
  onSelectFrame,
  onEnterFrame,
  onDuplicateFrame,
  onDeleteFrame,
  totalFrames,
}: {
  frame: Frame;
  index: number;
  isActive: boolean;
  onSelectFrame: (frameId: string) => void;
  onEnterFrame: (frameId: string) => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
  totalFrames: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('group relative', isDragging && 'opacity-40 z-50')}>
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-4 h-6 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing rounded-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      <div
        className="cursor-pointer"
        onClick={() => onSelectFrame(frame.id)}
        onDoubleClick={() => onEnterFrame(frame.id)}
        title={`${frame.name} — double-click to edit`}
      >
        <SlideThumbnail slide={frameAsSlide(frame, index)} index={index} isActive={isActive} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-background transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onDuplicateFrame(frame.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDeleteFrame(frame.id)}
            disabled={totalFrames <= 1}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FramesPanel({
  frames,
  currentFrameId,
  onSelectFrame,
  onEnterFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onReorder,
  readOnly,
}: FramesPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = frames.findIndex((f) => f.id === active.id);
    const toIndex = frames.findIndex((f) => f.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) onReorder(fromIndex, toIndex);
  };

  return (
    <div className="flex-shrink-0 w-[180px] bg-background border-r overflow-y-auto p-2 space-y-1.5">
      {readOnly ? (
        frames.map((frame, index) => (
          <div key={frame.id} className="cursor-pointer" onClick={() => onSelectFrame(frame.id)}>
            <SlideThumbnail slide={frameAsSlide(frame, index)} index={index} isActive={frame.id === currentFrameId} />
          </div>
        ))
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={frames.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {frames.map((frame, index) => (
                <SortableFrameItem
                  key={frame.id}
                  frame={frame}
                  index={index}
                  isActive={frame.id === currentFrameId}
                  onSelectFrame={onSelectFrame}
                  onEnterFrame={onEnterFrame}
                  onDuplicateFrame={onDuplicateFrame}
                  onDeleteFrame={onDeleteFrame}
                  totalFrames={frames.length}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full aspect-video flex items-center justify-center border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={onAddFrame}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/presentation/editor/FramesPanel.tsx
git commit -m "feat: add sequence-aware FramesPanel"
```

---

## Task 8: `PresentationEditor` — switch to canvas state, modes, dual-write

**Files:**
- Modify: `src/components/app/presentation/editor/PresentationEditor.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/app/presentation/editor/PresentationEditor.tsx` with:
```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';
import { useCreatePresentationGame } from '@/firebase/presentation/use-presentation-game';
import { useCanvasState } from '@/hooks/presentation/use-canvas-state';
import { getCanvas, canvasToSlides } from '@/lib/utils/canvas-migration';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { EditorToolbar } from './EditorToolbar';
import { FramesPanel } from './FramesPanel';
import { SlideCanvas } from './SlideCanvas';
import { InfiniteCanvas } from './InfiniteCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Keyboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Presentation } from '@/lib/types';

interface PresentationEditorProps {
  presentation?: Presentation;
  readOnly?: boolean;
}

export function PresentationEditor({ presentation, readOnly }: PresentationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { createPresentation, updatePresentation } = usePresentationMutations();
  const { createGame: createPresentationGame } = useCreatePresentationGame();

  const editor = useCanvasState(
    presentation
      ? {
          canvas: getCanvas(presentation),
          title: presentation.title,
          description: presentation.description,
          settings: presentation.settings,
          theme: presentation.theme,
        }
      : undefined
  );

  useUnsavedChangesWarning(!readOnly && editor.isDirty);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleSave = useCallback(async () => {
    try {
      const slides = canvasToSlides(editor.canvas);
      if (presentation) {
        await updatePresentation(presentation.id, {
          title: editor.title,
          description: editor.description || undefined,
          canvas: editor.canvas,
          slides,
          settings: editor.settings,
          theme: editor.theme,
        });
        editor.markClean();
        toast({ title: 'Saved' });
      } else {
        const id = await createPresentation(editor.title, slides);
        await updatePresentation(id, {
          description: editor.description || undefined,
          canvas: editor.canvas,
          settings: editor.settings,
          theme: editor.theme,
        });
        editor.markClean();
        toast({ title: 'Presentation created' });
        router.replace(`/host/presentation/edit/${id}`);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save' });
    }
  }, [presentation, editor, createPresentation, updatePresentation, router, toast]);

  useEffect(() => {
    if (readOnly) return;
    if (editor.isDirty) {
      autoSaveTimerRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          await handleSave();
        } finally {
          setIsAutoSaving(false);
        }
      }, 30000);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [editor.isDirty, editor.canvas, handleSave, readOnly]);

  const handlePresent = useCallback(async () => {
    if (!presentation || !user) return;
    try {
      if (editor.isDirty) await handleSave();
      const gameId = await createPresentationGame(presentation.id, user.uid, editor.settings, editor.title);
      router.push(`/host/presentation/present/${gameId}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not start presentation.' });
      throw new Error('Failed to start presentation');
    }
  }, [presentation, user, editor.isDirty, editor.settings, editor.title, handleSave, createPresentationGame, router, toast]);

  const handleBack = useCallback(() => router.push('/host'), [router]);

  // Clear inline editing when changing frame or leaving edit mode
  useEffect(() => {
    setEditingElementId(null);
  }, [editor.currentFrameId, editor.mode]);

  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Escape' && editor.mode === 'edit') {
        e.preventDefault();
        editor.exitToOverview();
        return;
      }
      if (editor.mode !== 'edit') return; // element shortcuts only in edit mode

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedElementIds.length > 1) {
          e.preventDefault();
          editor.deleteElements(editor.selectedElementIds);
        } else if (editor.selectedElementId) {
          e.preventDefault();
          editor.deleteElement(editor.selectedElementId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') { if (editor.selectedElementId) { e.preventDefault(); editor.copyElement(); } }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') { e.preventDefault(); editor.pasteElement(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { if (editor.selectedElementId) { e.preventDefault(); editor.duplicateElement(); } }
      if (editor.selectedElementId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        const updates: Record<string, number> = {};
        if (e.key === 'ArrowUp') updates.y = (editor.selectedElement?.y ?? 0) - delta;
        if (e.key === 'ArrowDown') updates.y = (editor.selectedElement?.y ?? 0) + delta;
        if (e.key === 'ArrowLeft') updates.x = (editor.selectedElement?.x ?? 0) - delta;
        if (e.key === 'ArrowRight') updates.x = (editor.selectedElement?.x ?? 0) + delta;
        editor.updateElement(editor.selectedElementId, updates);
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, handleSave, readOnly]);

  const currentFrameNumber = editor.currentFrame
    ? editor.framesInOrder.findIndex((f) => f.id === editor.currentFrame!.id) + 1
    : 0;

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      <EditorToolbar
        title={editor.title}
        onTitleChange={editor.setTitle}
        onSave={handleSave}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        isDirty={editor.isDirty}
        onAddElement={editor.addElement}
        currentSlideHasInteractive={editor.currentFrameHasInteractive}
        settings={editor.settings}
        onUpdateSettings={editor.updateSettings}
        theme={editor.theme}
        onUpdateTheme={editor.updateTheme}
        slides={editor.slidesView}
        onApplyTemplate={editor.applyTemplate}
        presentationId={presentation?.id}
        onPresent={presentation ? handlePresent : undefined}
        onBack={handleBack}
        description={editor.description}
        onDescriptionChange={editor.setDescription}
        readOnly={readOnly}
      />

      <div className="flex flex-1 overflow-hidden">
        <FramesPanel
          frames={editor.framesInOrder}
          currentFrameId={editor.currentFrameId}
          onSelectFrame={editor.setCurrentFrameId}
          onEnterFrame={editor.enterFrame}
          onAddFrame={editor.addFrame}
          onDuplicateFrame={editor.duplicateFrame}
          onDeleteFrame={editor.deleteFrame}
          onReorder={editor.reorderSequence}
          readOnly={readOnly}
        />

        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize="70" minSize="40" className="flex flex-col">
            {editor.mode === 'edit' && editor.currentSlideView ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {!readOnly && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-background/60">
                    <Button variant="ghost" size="sm" className="h-7" onClick={editor.exitToOverview}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Overview
                    </Button>
                    <span className="text-xs text-muted-foreground">{editor.currentFrame?.name}</span>
                  </div>
                )}
                <SlideCanvas
                  slide={editor.currentSlideView}
                  selectedElementId={editor.selectedElementId}
                  selectedElementIds={editor.selectedElementIds}
                  onSelectElement={editor.selectElement}
                  onToggleSelectElement={editor.toggleSelectElement}
                  onUpdateElement={editor.updateElement}
                  onDeleteElement={editor.deleteElement}
                  onAddElement={editor.addElement}
                  onBringToFront={editor.bringToFront}
                  onSendToBack={editor.sendToBack}
                  onCopyElement={editor.copyElement}
                  onPasteElement={editor.pasteElement}
                  onDuplicateElement={editor.duplicateElement}
                  theme={editor.theme}
                  editingElementId={editingElementId}
                  onStartEditing={setEditingElementId}
                  onStopEditing={() => setEditingElementId(null)}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onStartDrag={editor.startDrag}
                  onEndDrag={editor.endDrag}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <InfiniteCanvas
                canvas={editor.canvas}
                className="flex-1"
                selectedFrameId={editor.currentFrameId}
                onFrameSelect={readOnly ? undefined : editor.setCurrentFrameId}
                onFrameActivate={readOnly ? undefined : editor.enterFrame}
                onFrameMove={readOnly ? undefined : editor.moveFrame}
              />
            )}
          </ResizablePanel>

          {!readOnly && editor.mode === 'edit' && <ResizableHandle withHandle />}

          {!readOnly && editor.mode === 'edit' && (
            <ResizablePanel defaultSize="30" minSize="15" maxSize="60">
              <PropertiesPanel
                selectedElement={editor.selectedElement}
                selectedElements={editor.selectedElements}
                slide={editor.currentSlideView}
                slides={editor.slidesView}
                presentationId={presentation?.id}
                onUpdateElement={(updates) => {
                  if (editor.selectedElementIds.length > 1) editor.updateElements(editor.selectedElementIds, updates);
                  else if (editor.selectedElementId) editor.updateElement(editor.selectedElementId, updates);
                }}
                onUpdateBackground={editor.updateSlideBackground}
                onUpdateNotes={editor.updateSlideNotes}
                onUpdateTransition={editor.updateSlideTransition}
                onBringToFront={editor.bringToFront}
                onSendToBack={editor.sendToBack}
                onMoveForward={editor.moveForward}
                onMoveBackward={editor.moveBackward}
                onAlignElement={editor.alignElement}
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground glass-subtle">
        <span className="flex items-center gap-2">
          {editor.mode === 'edit' && editor.currentFrame
            ? `Frame ${currentFrameNumber}/${editor.framesInOrder.length} · ${editor.currentFrame.name}`
            : `Overview · ${editor.framesInOrder.length} frames`}
        </span>
        <span className="flex items-center gap-2">
          {!readOnly && (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${editor.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} />
              {isAutoSaving ? 'Auto-saving...' : editor.isDirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          )}
          {!readOnly && editor.interactiveElementCount > 0 && <> &middot; {editor.interactiveElementCount} interactive</>}
          <div className="w-px h-3 bg-border/50" />
          {!readOnly && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
              <Keyboard className="h-3 w-3" />
            </Button>
          )}
        </span>
      </div>

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. If `EditorToolbar`'s `slides` prop is typed `PresentationSlide[]`, `editor.slidesView` (which is `PresentationSlide[]`) satisfies it. If a type error surfaces from `SlideCanvas`'s `slide` prop, confirm `editor.currentSlideView` is `PresentationSlide | null` (it is) — no change needed.

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: PASS — production build completes.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/presentation/editor/PresentationEditor.tsx
git commit -m "feat: make PresentationEditor canvas-native (overview/edit modes, dual-write)"
```

---

## Task 9: Remove dead code (`use-editor-state`, `SlidePanel`)

Both are now used only by the (already-migrated) `PresentationEditor`.

**Files:**
- Delete: `src/hooks/presentation/use-editor-state.ts`
- Delete: `src/components/app/presentation/editor/SlidePanel.tsx`

- [ ] **Step 1: Confirm there are no remaining importers**

Run:
```bash
grep -rn "use-editor-state\|SlidePanel" src --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```
Expected: NO matches (the editor no longer imports either).

- [ ] **Step 2: Delete the files**

```bash
git rm src/hooks/presentation/use-editor-state.ts src/components/app/presentation/editor/SlidePanel.tsx
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS — nothing references the deleted files.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove slide-based use-editor-state and SlidePanel"
```

---

## Verification (whole plan)

- [ ] `npm test` — all suites pass: `canvas-ops` (new) + `canvas-camera`/`canvas-minimap`/`canvas-transition` + `canvas-migration`.
- [ ] `npm run typecheck` — no type errors.
- [ ] `npm run build` — production build succeeds.
- [ ] Manual smoke (optional, when wired): open a presentation → overview shows all frames → double-click enters edit → edits persist → "Overview" returns → drag a frame moves it → reorder in the Frames panel changes order without moving frames → save reloads with positions intact.
- [ ] Confirm dual-write: saving writes both `canvas` and `slides` (so present view / analytics / dashboard keep working).

---

## Follow-on (not in scope here)

- **Plan #3 — Consumer migration:** present view, player, analytics, AI functions read frames/sequence instead of `slides`/`currentSlideIndex` (then dual-write can drop `slides`).
- **Plan #4 — Free-floating elements:** lift the v1 "frames contain elements" simplification; enables true on-plane element editing.
- Multiple sequences, `theme`/`initialFit` threading into `InfiniteCanvas`, frame topic-cluster auto-layout.
- Frame **rename UI** in the Frames panel (the pure `renameFrame` op already exists in `canvas-ops` and is tested; only the inline-edit affordance is deferred).
```
