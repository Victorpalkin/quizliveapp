# Canvas Data Model & Migration Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the infinite-canvas data model (Canvas / Frame / Sequence) and a provably lossless, bidirectional migration between the existing slide model and the canvas model, fully unit-tested.

**Architecture:** This is the foundation layer for the infinite-canvas redesign (see `docs/superpowers/specs/2026-05-28-ai-adaptive-presentations-design.md`). It is **purely additive and backward-compatible** — it adds new types and pure functions without changing any rendering or persistence. A **v1 simplification**: frames *contain* their elements, and element coordinates remain percentages relative to their frame (identical to today's slide model). This makes the slide↔canvas round-trip trivially lossless. Free-floating elements that span multiple frames are deferred to a later plan. Subsequent plans build on this: (2) infinite canvas rendering, (3) editor integration via `use-canvas-state`, (4) consumer migration (host present, player, analytics, AI functions).

**Tech Stack:** TypeScript, Vitest (newly added — no test framework exists yet), nanoid (already a dependency).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `vitest.config.ts` (create) | Vitest configuration (node environment, path alias `@`) |
| `package.json` (modify) | Add `test` script + Vitest devDependencies |
| `src/lib/types/canvas.ts` (create) | New `Canvas`, `Frame`, `Sequence` types + layout constants |
| `src/lib/types/presentation.ts` (modify) | Add optional `canvas?: Canvas` field to `Presentation` |
| `src/lib/types/index.ts` (modify) | Re-export canvas types (if a barrel exists) |
| `src/lib/utils/canvas-migration.ts` (create) | `slidesToCanvas`, `canvasToSlides`, `getCanvas` |
| `src/lib/utils/canvas-migration.test.ts` (create) | Unit tests for migration (TDD) |

---

## Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest@^2.1.0 @vitejs/plugin-react@^4.3.0 vite-tsconfig-paths@^5.0.0
```
Expected: packages added to `devDependencies`, no errors.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to the `scripts` object (alongside the existing `dev`, `build`, `lint`, `typecheck`):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create a smoke test to verify the runner works**

Create `src/lib/utils/canvas-migration.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS — 1 passed, the "vitest smoke test > runs" test is green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/utils/canvas-migration.test.ts
git commit -m "chore: set up Vitest test framework"
```

---

## Task 2: Define canvas types and layout constants

**Files:**
- Create: `src/lib/types/canvas.ts`

- [ ] **Step 1: Create the canvas types file**

Create `src/lib/types/canvas.ts`:
```typescript
import type { SlideElement, SlideBackground, PresentationSlide } from './presentation';

/**
 * Default frame dimensions in canvas pixels (16:9).
 * A frame is a viewport region on the infinite canvas.
 */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
/** Horizontal gap between frames in the default left-to-right layout. */
export const FRAME_GAP = 160;
/** Id of the default sequence created during migration. */
export const DEFAULT_SEQUENCE_ID = 'main';

/**
 * A frame is a named rectangular viewport on the infinite canvas.
 *
 * v1 simplification: a frame CONTAINS its elements, and element
 * coordinates (x/y/width/height) remain percentages relative to the
 * frame — identical to the legacy slide model. This keeps the
 * slide<->canvas round-trip lossless. Free-floating elements that span
 * frames are a future enhancement.
 */
export interface Frame {
  id: string;
  name: string;
  /** Absolute X position of the frame on the infinite canvas, in px. */
  canvasX: number;
  /** Absolute Y position of the frame on the infinite canvas, in px. */
  canvasY: number;
  /** Frame width in canvas px. */
  width: number;
  /** Frame height in canvas px. */
  height: number;
  /** Elements with frame-relative percentage coordinates. */
  elements: SlideElement[];
  background?: SlideBackground;
  notes?: string;
  /** Reuses the legacy slide transition union for lossless v1 migration. */
  transition?: PresentationSlide['transition'];
  /** AI-assigned topic grouping (set by later AI features). */
  topicCluster?: string;
}

/** An ordered path through frames. Defines navigation order. */
export interface Sequence {
  id: string;
  name: string;
  frameIds: string[];
}

/** The infinite canvas: all frames plus the sequences that order them. */
export interface Canvas {
  frames: Frame[];
  sequences: Sequence[];
  defaultSequenceId: string;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/canvas.ts
git commit -m "feat: add Canvas/Frame/Sequence types"
```

---

## Task 3: Implement `slidesToCanvas` (TDD)

**Files:**
- Create: `src/lib/utils/canvas-migration.ts`
- Test: `src/lib/utils/canvas-migration.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/lib/utils/canvas-migration.test.ts` with:
```typescript
import { describe, it, expect } from 'vitest';
import { slidesToCanvas } from './canvas-migration';
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  FRAME_GAP,
  DEFAULT_SEQUENCE_ID,
} from '../types/canvas';
import type { PresentationSlide } from '../types/presentation';

function makeSlide(id: string, order: number): PresentationSlide {
  return {
    id,
    order,
    elements: [
      { id: `${id}-el`, type: 'text', x: 10, y: 10, width: 80, height: 10, zIndex: 1, content: 'Hi' },
    ],
    background: { type: 'solid', color: '#ffffff' },
    notes: `notes-${id}`,
    transition: 'fade',
  };
}

describe('slidesToCanvas', () => {
  it('creates one frame per slide, preserving id, elements, background, notes, transition', () => {
    const slides = [makeSlide('a', 0), makeSlide('b', 1)];
    const canvas = slidesToCanvas(slides);

    expect(canvas.frames).toHaveLength(2);
    expect(canvas.frames[0].id).toBe('a');
    expect(canvas.frames[0].elements).toEqual(slides[0].elements);
    expect(canvas.frames[0].background).toEqual(slides[0].background);
    expect(canvas.frames[0].notes).toBe('notes-a');
    expect(canvas.frames[0].transition).toBe('fade');
  });

  it('lays frames out left-to-right with the configured gap', () => {
    const slides = [makeSlide('a', 0), makeSlide('b', 1)];
    const canvas = slidesToCanvas(slides);

    expect(canvas.frames[0].canvasX).toBe(0);
    expect(canvas.frames[0].canvasY).toBe(0);
    expect(canvas.frames[0].width).toBe(FRAME_WIDTH);
    expect(canvas.frames[0].height).toBe(FRAME_HEIGHT);
    expect(canvas.frames[1].canvasX).toBe(FRAME_WIDTH + FRAME_GAP);
    expect(canvas.frames[1].canvasY).toBe(0);
  });

  it('sorts slides by order before creating frames', () => {
    const slides = [makeSlide('b', 1), makeSlide('a', 0)];
    const canvas = slidesToCanvas(slides);
    expect(canvas.frames.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('builds a default sequence listing all frames in order', () => {
    const slides = [makeSlide('a', 0), makeSlide('b', 1)];
    const canvas = slidesToCanvas(slides);

    expect(canvas.defaultSequenceId).toBe(DEFAULT_SEQUENCE_ID);
    expect(canvas.sequences).toHaveLength(1);
    expect(canvas.sequences[0].id).toBe(DEFAULT_SEQUENCE_ID);
    expect(canvas.sequences[0].frameIds).toEqual(['a', 'b']);
  });

  it('names frames sequentially', () => {
    const slides = [makeSlide('a', 0), makeSlide('b', 1)];
    const canvas = slidesToCanvas(slides);
    expect(canvas.frames[0].name).toBe('Frame 1');
    expect(canvas.frames[1].name).toBe('Frame 2');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `slidesToCanvas` is not exported / module `./canvas-migration` cannot be resolved.

- [ ] **Step 3: Implement `slidesToCanvas`**

Create `src/lib/utils/canvas-migration.ts`:
```typescript
import type { PresentationSlide } from '../types/presentation';
import type { Canvas, Frame } from '../types/canvas';
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  FRAME_GAP,
  DEFAULT_SEQUENCE_ID,
} from '../types/canvas';

/**
 * Convert the legacy slide array into the canvas model.
 * Each slide becomes a frame laid out left-to-right. Element
 * coordinates are preserved unchanged (frame-relative percentages).
 */
export function slidesToCanvas(slides: PresentationSlide[]): Canvas {
  const ordered = [...slides].sort((a, b) => a.order - b.order);

  const frames: Frame[] = ordered.map((slide, index) => ({
    id: slide.id,
    name: `Frame ${index + 1}`,
    canvasX: index * (FRAME_WIDTH + FRAME_GAP),
    canvasY: 0,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    elements: slide.elements,
    background: slide.background,
    notes: slide.notes,
    transition: slide.transition,
  }));

  return {
    frames,
    sequences: [
      {
        id: DEFAULT_SEQUENCE_ID,
        name: 'Main',
        frameIds: frames.map((f) => f.id),
      },
    ],
    defaultSequenceId: DEFAULT_SEQUENCE_ID,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `slidesToCanvas` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-migration.ts src/lib/utils/canvas-migration.test.ts
git commit -m "feat: add slidesToCanvas migration"
```

---

## Task 4: Implement `canvasToSlides` (TDD)

**Files:**
- Modify: `src/lib/utils/canvas-migration.ts`
- Test: `src/lib/utils/canvas-migration.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/utils/canvas-migration.test.ts` (before the final closing of the file — add as a new top-level `describe`):
```typescript
import { canvasToSlides } from './canvas-migration';
import type { Canvas } from '../types/canvas';

describe('canvasToSlides', () => {
  function makeCanvas(): Canvas {
    return {
      frames: [
        {
          id: 'a', name: 'Frame 1', canvasX: 0, canvasY: 0,
          width: 1280, height: 720,
          elements: [{ id: 'a-el', type: 'text', x: 10, y: 10, width: 80, height: 10, zIndex: 1, content: 'Hi' }],
          background: { type: 'solid', color: '#ffffff' },
          notes: 'notes-a',
          transition: 'fade',
        },
        {
          id: 'b', name: 'Frame 2', canvasX: 1440, canvasY: 0,
          width: 1280, height: 720,
          elements: [],
          transition: 'none',
        },
      ],
      sequences: [{ id: 'main', name: 'Main', frameIds: ['a', 'b'] }],
      defaultSequenceId: 'main',
    };
  }

  it('produces one slide per frame in default-sequence order', () => {
    const slides = canvasToSlides(makeCanvas());
    expect(slides.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('assigns sequential order indices', () => {
    const slides = canvasToSlides(makeCanvas());
    expect(slides[0].order).toBe(0);
    expect(slides[1].order).toBe(1);
  });

  it('preserves elements, background, notes, transition', () => {
    const canvas = makeCanvas();
    const slides = canvasToSlides(canvas);
    expect(slides[0].elements).toEqual(canvas.frames[0].elements);
    expect(slides[0].background).toEqual(canvas.frames[0].background);
    expect(slides[0].notes).toBe('notes-a');
    expect(slides[0].transition).toBe('fade');
  });

  it('orders slides by the default sequence even if frames array order differs', () => {
    const canvas = makeCanvas();
    // Reverse the frames array; sequence still says a then b
    canvas.frames = [canvas.frames[1], canvas.frames[0]];
    const slides = canvasToSlides(canvas);
    expect(slides.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `canvasToSlides` is not exported.

- [ ] **Step 3: Implement `canvasToSlides`**

`PresentationSlide` is already imported at the top of the file (from Task 3) — do NOT add another import. Append only this function to the bottom of `src/lib/utils/canvas-migration.ts`:
```typescript
/**
 * Convert the canvas model back into the legacy slide array.
 * Slide order follows the default sequence's frameIds. Any frames not
 * referenced by the default sequence are appended in frames-array order.
 */
export function canvasToSlides(canvas: Canvas): PresentationSlide[] {
  const frameById = new Map(canvas.frames.map((f) => [f.id, f]));
  const defaultSeq = canvas.sequences.find((s) => s.id === canvas.defaultSequenceId);

  const orderedIds: string[] = [];
  if (defaultSeq) {
    for (const id of defaultSeq.frameIds) {
      if (frameById.has(id)) orderedIds.push(id);
    }
  }
  // Append any frames missing from the sequence, preserving array order.
  for (const f of canvas.frames) {
    if (!orderedIds.includes(f.id)) orderedIds.push(f.id);
  }

  return orderedIds.map((id, index) => {
    const frame = frameById.get(id)!;
    return {
      id: frame.id,
      order: index,
      elements: frame.elements,
      background: frame.background,
      notes: frame.notes,
      transition: frame.transition,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvasToSlides` tests green.

- [ ] **Step 5: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS — no duplicate-import or type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/canvas-migration.ts src/lib/utils/canvas-migration.test.ts
git commit -m "feat: add canvasToSlides migration"
```

---

## Task 5: Prove round-trip losslessness (TDD)

**Files:**
- Test: `src/lib/utils/canvas-migration.test.ts`

- [ ] **Step 1: Write the round-trip test**

Append a new `describe` block to `src/lib/utils/canvas-migration.test.ts`:
```typescript
describe('round-trip losslessness', () => {
  function canonicalSlides(): PresentationSlide[] {
    return [
      {
        id: 's1', order: 0,
        elements: [
          { id: 's1-text', type: 'text', x: 5, y: 5, width: 90, height: 12, zIndex: 1, content: 'Title', fontSize: 32 },
          { id: 's1-quiz', type: 'quiz', x: 10, y: 20, width: 80, height: 60, zIndex: 2,
            quizConfig: { question: 'Q?', answers: [{ text: 'A' }, { text: 'B' }], correctAnswerIndex: 0, timeLimit: 20, pointValue: 1000 } },
        ],
        background: { type: 'gradient', gradient: 'linear-gradient(...)' },
        notes: 'speaker notes',
        transition: 'zoom',
      },
      {
        id: 's2', order: 1,
        elements: [],
        background: { type: 'solid', color: '#000000' },
        transition: 'none',
      },
    ];
  }

  it('canvasToSlides(slidesToCanvas(x)) deep-equals x for canonical input', () => {
    const slides = canonicalSlides();
    const result = canvasToSlides(slidesToCanvas(slides));
    expect(result).toEqual(slides);
  });

  it('normalizes non-sequential order values on round-trip', () => {
    const slides = canonicalSlides();
    slides[0].order = 7;
    slides[1].order = 3;
    const result = canvasToSlides(slidesToCanvas(slides));
    // Order is normalized to 0..n-1 following the sorted order (s2 had order 3 < 7, so it comes first)
    expect(result.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(result.map((s) => s.order)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`
Expected: PASS — both round-trip tests green. (No implementation change needed; this verifies Tasks 3 & 4 compose correctly.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/canvas-migration.test.ts
git commit -m "test: prove slide<->canvas round-trip is lossless"
```

---

## Task 6: Add `getCanvas` read adapter (TDD)

**Files:**
- Modify: `src/lib/utils/canvas-migration.ts`
- Modify: `src/lib/types/presentation.ts`
- Test: `src/lib/utils/canvas-migration.test.ts`

This adapter lets future code always work with a `Canvas`, whether the stored presentation has a `canvas` field (new) or only `slides` (legacy).

- [ ] **Step 1: Add the optional `canvas` field to `Presentation`**

In `src/lib/types/presentation.ts`, modify the `Presentation` interface to add the field (place it after `slides`):
```typescript
export interface Presentation {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  slides: PresentationSlide[];
  /** New canvas model. When absent, derive from `slides` via getCanvas(). */
  canvas?: Canvas;
  settings: PresentationSettings;
  theme: PresentationTheme;
  createdAt: Date;
  updatedAt: Date;
}
```

Add the import at the top of `src/lib/types/presentation.ts` (after the existing imports):
```typescript
import type { Canvas } from './canvas';
```

- [ ] **Step 2: Write the failing test**

Append a new `describe` block to `src/lib/utils/canvas-migration.test.ts`:
```typescript
import { getCanvas } from './canvas-migration';
import type { Presentation } from '../types/presentation';

describe('getCanvas', () => {
  const base: Omit<Presentation, 'slides' | 'canvas'> = {
    id: 'p1', title: 'T', hostId: 'h1',
    settings: {} as Presentation['settings'],
    theme: {} as Presentation['theme'],
    createdAt: new Date(0), updatedAt: new Date(0),
  };

  it('returns the stored canvas when present', () => {
    const canvas = slidesToCanvas([
      { id: 'a', order: 0, elements: [] },
    ]);
    const pres: Presentation = { ...base, slides: [], canvas };
    expect(getCanvas(pres)).toBe(canvas);
  });

  it('derives a canvas from slides when canvas is absent', () => {
    const pres: Presentation = {
      ...base,
      slides: [{ id: 'a', order: 0, elements: [] }],
    };
    const result = getCanvas(pres);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].id).toBe('a');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `getCanvas` is not exported.

- [ ] **Step 4: Implement `getCanvas`**

First, at the **top** of `src/lib/utils/canvas-migration.ts`, extend the existing `../types/presentation` import to also import `Presentation`. The import line should become:
```typescript
import type { PresentationSlide, Presentation } from '../types/presentation';
```

Then append this function to the **bottom** of the file:
```typescript
/**
 * Always return a Canvas for a presentation: the stored `canvas` if
 * present, otherwise one derived from the legacy `slides` array.
 */
export function getCanvas(presentation: Presentation): Canvas {
  return presentation.canvas ?? slidesToCanvas(presentation.slides);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — both `getCanvas` tests green.

- [ ] **Step 6: Verify the whole project still typechecks**

Run: `npm run typecheck`
Expected: PASS — adding the optional `canvas?` field does not break existing code.

- [ ] **Step 7: Run the full test suite and lint**

Run: `npm test && npm run lint`
Expected: All tests PASS; lint reports no new errors in the created files.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types/presentation.ts src/lib/utils/canvas-migration.ts src/lib/utils/canvas-migration.test.ts
git commit -m "feat: add getCanvas read adapter and Presentation.canvas field"
```

---

## Verification (whole plan)

- [ ] `npm test` — all migration tests pass (slidesToCanvas, canvasToSlides, round-trip, getCanvas)
- [ ] `npm run typecheck` — no type errors
- [ ] `npm run lint` — no new lint errors (if the `import/first` rule flags the incrementally-appended test imports, move all `import` statements in `canvas-migration.test.ts` to the top of the file)
- [ ] `npm run build` — production build still succeeds (no runtime code paths changed)
- [ ] Confirm no existing files import from `canvas-migration.ts` yet (this layer is dormant until the rendering/editor plans wire it in)

---

## Follow-on plans (not in scope here)

1. **Infinite canvas rendering** — `InfiniteCanvas` component with pan/zoom, frame overlays, mini-map; richer `FrameTransition` (zoom-pan + durationMs).
2. **Editor integration** — `use-canvas-state` hook (replacing `use-editor-state`), frames panel with sequence reorder, persistence wiring (`getCanvas` on load, write `canvas` on save).
3. **Consumer migration** — host present view, player view, analytics, and AI cloud functions read frames/sequence instead of `slides`/`currentSlideIndex`.
4. **Free-floating elements** — lift the v1 "frames contain elements" simplification to allow elements that span frames.
