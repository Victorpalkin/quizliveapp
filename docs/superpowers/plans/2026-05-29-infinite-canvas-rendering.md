# Infinite Canvas Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only `InfiniteCanvas` rendering layer that displays a `Canvas` (frames laid out at absolute `canvasX/canvasY`) on a zoomable/pannable plane, with frame contents, frame overlays, a collapsible mini-map, and animated sequence navigation.

**Architecture:** Bespoke single-CSS-transform "world" container. All real logic lives in three pure, node-tested modules (`canvas-camera`, `canvas-minimap`, `canvas-transition`). A thin React shell (`use-canvas-navigation` hook + `InfiniteCanvas`/`FrameContent`/`FrameOverlay`/`MiniMap` components) wires `@use-gesture/react` input and a RAF animation loop to those pure functions. Read-only — no editing, no route, no `Frame` data-model change. The layer stays dormant until follow-on plan #2 (editor integration) imports it.

**Tech Stack:** TypeScript, Vitest (node env, already set up), React 19 / Next 15, `@use-gesture/react` (new runtime dep), Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-29-infinite-canvas-rendering-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` (modify) | Add `@use-gesture/react` dependency |
| `src/lib/utils/canvas-camera.ts` (create) | Camera model, world↔screen transforms, fit/zoom/pan math, frames bounding box |
| `src/lib/utils/canvas-camera.test.ts` (create) | Unit tests for camera math |
| `src/lib/utils/canvas-minimap.ts` (create) | Mini-map projection + click-to-camera |
| `src/lib/utils/canvas-minimap.test.ts` (create) | Unit tests for mini-map |
| `src/lib/utils/canvas-transition.ts` (create) | Render-time `FrameTransition`, legacy derivation, camera interpolation, sequence stepping |
| `src/lib/utils/canvas-transition.test.ts` (create) | Unit tests for transitions |
| `src/components/app/presentation/editor/elements/ElementRenderer.tsx` (create) | Shared read-only element renderer, extracted from `SlideCanvas` |
| `src/components/app/presentation/editor/SlideCanvas.tsx` (modify) | Import the extracted `ElementRenderer`; remove the local copy |
| `src/components/app/presentation/editor/FrameContent.tsx` (create) | Render one frame's elements read-only |
| `src/components/app/presentation/editor/FrameOverlay.tsx` (create) | Frame border + name badge |
| `src/components/app/presentation/editor/MiniMap.tsx` (create) | Collapsible corner mini-map |
| `src/hooks/presentation/use-canvas-navigation.ts` (create) | Camera state, RAF animation, gesture wiring |
| `src/components/app/presentation/editor/InfiniteCanvas.tsx` (create) | Viewport + world container; composes everything |

**Testing note:** Per the design's test-infra decision, only the three pure modules have unit tests. The React shell (hook + 5 components) is verified by `npm run typecheck` and `npm run build`; full visual verification happens when plan #2 adds a route.

---

## Task 1: Add the `@use-gesture/react` dependency

**Files:**
- Modify: `package.json` (+ `package-lock.json`)

- [ ] **Step 1: Install the package**

Run:
```bash
npm install @use-gesture/react@^10.3.0
```
Expected: `@use-gesture/react` added to `dependencies`, no errors.

- [ ] **Step 2: Verify the project still typechecks**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @use-gesture/react for canvas input"
```

---

## Task 2: Camera core — model, transforms, pan, bounding box (TDD)

**Files:**
- Create: `src/lib/utils/canvas-camera.ts`
- Test: `src/lib/utils/canvas-camera.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/canvas-camera.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  screenToWorld,
  cameraToTransform,
  clampZoom,
  panBy,
  framesBoundingBox,
  type Camera,
  type Viewport,
  type FrameBox,
} from './canvas-camera';

const VP: Viewport = { width: 800, height: 600 };

describe('worldToScreen / screenToWorld', () => {
  it('maps the camera center world point to the viewport center', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    expect(worldToScreen({ x: 100, y: 50 }, cam, VP)).toEqual({ x: 400, y: 300 });
  });

  it('round-trips an arbitrary point', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    const world = { x: 137, y: -22 };
    const screen = worldToScreen(world, cam, VP);
    const back = screenToWorld(screen, cam, VP);
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
  });
});

describe('cameraToTransform', () => {
  it('builds the world-container CSS transform', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    expect(cameraToTransform(cam, VP)).toBe(
      'translate(400px, 300px) scale(2) translate(-100px, -50px)'
    );
  });
});

describe('clampZoom', () => {
  it('clamps to the default 0.1..4 range', () => {
    expect(clampZoom(0.05)).toBe(0.1);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});

describe('panBy', () => {
  it('shifts the camera in world units scaled by zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 2 };
    expect(panBy(cam, 10, 20)).toEqual({ x: -5, y: -10, zoom: 2 });
  });
});

describe('framesBoundingBox', () => {
  it('returns null for no frames', () => {
    expect(framesBoundingBox([])).toBeNull();
  });

  it('computes the union box', () => {
    const frames: FrameBox[] = [
      { canvasX: 0, canvasY: 0, width: 100, height: 100 },
      { canvasX: 200, canvasY: 50, width: 100, height: 100 },
    ];
    expect(framesBoundingBox(frames)).toEqual({
      minX: 0, minY: 0, maxX: 300, maxY: 150, width: 300, height: 150,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module `./canvas-camera` cannot be resolved.

- [ ] **Step 3: Implement the camera core**

Create `src/lib/utils/canvas-camera.ts`:
```typescript
/**
 * Pure camera math for the infinite canvas. No DOM, no React — fully unit-testable.
 *
 * Camera.(x, y) is the WORLD coordinate displayed at the viewport center.
 * Camera.zoom is the scale factor (screen px per world px).
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Geometry-only view of a Frame (a full Frame is structurally assignable). */
export interface FrameBox {
  id?: string;
  canvasX: number;
  canvasY: number;
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.min(max, Math.max(min, zoom));
}

export function worldToScreen(point: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (point.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

export function screenToWorld(point: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (point.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/**
 * CSS transform for the world container (set transform-origin: 0 0).
 * Maps a child positioned at world (wx, wy) to its on-screen location.
 */
export function cameraToTransform(camera: Camera, viewport: Viewport): string {
  return (
    `translate(${viewport.width / 2}px, ${viewport.height / 2}px) ` +
    `scale(${camera.zoom}) ` +
    `translate(${-camera.x}px, ${-camera.y}px)`
  );
}

/** Pan by a screen-space delta; content follows the drag. */
export function panBy(camera: Camera, dxScreen: number, dyScreen: number): Camera {
  return {
    ...camera,
    x: camera.x - dxScreen / camera.zoom,
    y: camera.y - dyScreen / camera.zoom,
  };
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function framesBoundingBox(frames: FrameBox[]): BoundingBox | null {
  if (frames.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of frames) {
    minX = Math.min(minX, f.canvasX);
    minY = Math.min(minY, f.canvasY);
    maxX = Math.max(maxX, f.canvasX + f.width);
    maxY = Math.max(maxY, f.canvasY + f.height);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvas-camera` core tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-camera.ts src/lib/utils/canvas-camera.test.ts
git commit -m "feat: add canvas camera transforms and bounding box"
```

---

## Task 3: Camera fit & zoom-at-point (TDD)

**Files:**
- Modify: `src/lib/utils/canvas-camera.ts`
- Test: `src/lib/utils/canvas-camera.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/utils/canvas-camera.test.ts` (add these imports to the existing import block at the top, then add the new `describe` blocks):

Add to the import list from `./canvas-camera`: `fitFrame`, `fitAllFrames`, `zoomAtPoint`.

Then append:
```typescript
describe('fitFrame', () => {
  it('centers on the frame and zooms to fit with default 10% padding', () => {
    const frame: FrameBox = { canvasX: 0, canvasY: 0, width: 1280, height: 720 };
    const cam = fitFrame(frame, { width: 1280, height: 720 });
    expect(cam.x).toBe(640);
    expect(cam.y).toBe(360);
    expect(cam.zoom).toBeCloseTo(0.9, 6); // min(1280*0.9/1280, 720*0.9/720)
  });
});

describe('fitAllFrames', () => {
  it('falls back to identity when there are no frames', () => {
    expect(fitAllFrames([], { width: 800, height: 600 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('centers on the union box and zooms to fit', () => {
    const frames: FrameBox[] = [
      { canvasX: 0, canvasY: 0, width: 1000, height: 500 },
      { canvasX: 2000, canvasY: 0, width: 1000, height: 500 },
    ];
    // union box: 3000 x 500, center (1500, 250)
    const cam = fitAllFrames(frames, { width: 3000, height: 500 });
    expect(cam.x).toBe(1500);
    expect(cam.y).toBe(250);
    expect(cam.zoom).toBeCloseTo(0.9, 6); // min(3000*0.9/3000, 500*0.9/500)
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the cursor fixed on screen', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 1 };
    const cursor = { x: 500, y: 300 };
    const worldBefore = screenToWorld(cursor, cam, VP);
    const next = zoomAtPoint(cam, cursor, 2, VP);
    expect(next.zoom).toBe(2);
    const screenAfter = worldToScreen(worldBefore, next, VP);
    expect(screenAfter.x).toBeCloseTo(cursor.x, 6);
    expect(screenAfter.y).toBeCloseTo(cursor.y, 6);
  });

  it('clamps the requested zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 1 };
    expect(zoomAtPoint(cam, { x: 400, y: 300 }, 99, VP).zoom).toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `fitFrame` / `fitAllFrames` / `zoomAtPoint` are not exported.

- [ ] **Step 3: Implement fit & zoom**

Append to `src/lib/utils/canvas-camera.ts`:
```typescript
/** Center on a single frame, zoomed to fit with a viewport-fraction margin. */
export function fitFrame(frame: FrameBox, viewport: Viewport, paddingRatio = 0.1): Camera {
  const zoomX = (viewport.width * (1 - paddingRatio)) / frame.width;
  const zoomY = (viewport.height * (1 - paddingRatio)) / frame.height;
  return {
    x: frame.canvasX + frame.width / 2,
    y: frame.canvasY + frame.height / 2,
    zoom: clampZoom(Math.min(zoomX, zoomY)),
  };
}

/** Center on the union of all frames, zoomed to fit. Empty -> identity camera. */
export function fitAllFrames(frames: FrameBox[], viewport: Viewport, paddingRatio = 0.1): Camera {
  const bbox = framesBoundingBox(frames);
  if (!bbox) return { x: 0, y: 0, zoom: 1 };
  const zoomX = (viewport.width * (1 - paddingRatio)) / bbox.width;
  const zoomY = (viewport.height * (1 - paddingRatio)) / bbox.height;
  return {
    x: bbox.minX + bbox.width / 2,
    y: bbox.minY + bbox.height / 2,
    zoom: clampZoom(Math.min(zoomX, zoomY)),
  };
}

/** Zoom to newZoom while keeping the world point under screenPoint fixed. */
export function zoomAtPoint(
  camera: Camera,
  screenPoint: Point,
  newZoom: number,
  viewport: Viewport
): Camera {
  const z = clampZoom(newZoom);
  const worldBefore = screenToWorld(screenPoint, camera, viewport);
  return {
    x: worldBefore.x - (screenPoint.x - viewport.width / 2) / z,
    y: worldBefore.y - (screenPoint.y - viewport.height / 2) / z,
    zoom: z,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvas-camera` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-camera.ts src/lib/utils/canvas-camera.test.ts
git commit -m "feat: add fitFrame, fitAllFrames, zoomAtPoint camera helpers"
```

---

## Task 4: Mini-map projection (TDD)

**Files:**
- Create: `src/lib/utils/canvas-minimap.ts`
- Test: `src/lib/utils/canvas-minimap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/canvas-minimap.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { projectMinimap, minimapPointToCamera } from './canvas-minimap';
import type { Camera, Viewport, FrameBox } from './canvas-camera';

const FRAMES: FrameBox[] = [
  { id: 'a', canvasX: 0, canvasY: 0, width: 100, height: 100 },
  { id: 'b', canvasX: 200, canvasY: 0, width: 100, height: 100 },
];
// union box: 300 x 100
const MINIMAP = { width: 300, height: 100 }; // -> scale 1

describe('projectMinimap', () => {
  it('projects frames into minimap space at the fit scale', () => {
    const cam: Camera = { x: 50, y: 50, zoom: 1 };
    const vp: Viewport = { width: 100, height: 100 };
    const { frameRects } = projectMinimap(FRAMES, cam, vp, MINIMAP);
    expect(frameRects).toEqual([
      { id: 'a', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', x: 200, y: 0, width: 100, height: 100 },
    ]);
  });

  it('projects the current viewport rect', () => {
    const cam: Camera = { x: 50, y: 50, zoom: 1 };
    const vp: Viewport = { width: 100, height: 100 };
    const { viewportRect } = projectMinimap(FRAMES, cam, vp, MINIMAP);
    // visible world = 100x100 centered at (50,50) -> top-left (0,0)
    expect(viewportRect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('returns empty rects for no frames', () => {
    const { frameRects } = projectMinimap([], { x: 0, y: 0, zoom: 1 }, { width: 100, height: 100 }, MINIMAP);
    expect(frameRects).toEqual([]);
  });
});

describe('minimapPointToCamera', () => {
  it('inverts the projection, preserving zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 3 };
    const vp: Viewport = { width: 100, height: 100 };
    // click at frame b center in minimap space (250, 50)
    const result = minimapPointToCamera({ x: 250, y: 50 }, FRAMES, vp, MINIMAP, cam);
    expect(result.x).toBeCloseTo(250, 6);
    expect(result.y).toBeCloseTo(50, 6);
    expect(result.zoom).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module `./canvas-minimap` cannot be resolved.

- [ ] **Step 3: Implement the mini-map**

Create `src/lib/utils/canvas-minimap.ts`:
```typescript
import { framesBoundingBox, type Camera, type FrameBox, type Point, type Viewport } from './canvas-camera';

export interface MinimapRect {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinimapProjection {
  frameRects: MinimapRect[];
  viewportRect: MinimapRect;
}

interface Size {
  width: number;
  height: number;
}

/** Scale that fits the frames' world bbox inside the minimap box. */
function minimapScale(frames: FrameBox[], minimapSize: Size): { scale: number; minX: number; minY: number } {
  const bbox = framesBoundingBox(frames);
  if (!bbox || bbox.width === 0 || bbox.height === 0) {
    return { scale: 1, minX: bbox?.minX ?? 0, minY: bbox?.minY ?? 0 };
  }
  return {
    scale: Math.min(minimapSize.width / bbox.width, minimapSize.height / bbox.height),
    minX: bbox.minX,
    minY: bbox.minY,
  };
}

export function projectMinimap(
  frames: FrameBox[],
  camera: Camera,
  viewport: Viewport,
  minimapSize: Size
): MinimapProjection {
  const { scale, minX, minY } = minimapScale(frames, minimapSize);

  const frameRects: MinimapRect[] = frames.map((f) => ({
    id: f.id,
    x: (f.canvasX - minX) * scale,
    y: (f.canvasY - minY) * scale,
    width: f.width * scale,
    height: f.height * scale,
  }));

  const visW = viewport.width / camera.zoom;
  const visH = viewport.height / camera.zoom;
  const viewportRect: MinimapRect = {
    x: (camera.x - visW / 2 - minX) * scale,
    y: (camera.y - visH / 2 - minY) * scale,
    width: visW * scale,
    height: visH * scale,
  };

  return { frameRects, viewportRect };
}

/** A click in minimap space -> a camera centered on that world point (zoom kept). */
export function minimapPointToCamera(
  point: Point,
  frames: FrameBox[],
  _viewport: Viewport,
  minimapSize: Size,
  currentCamera: Camera
): Camera {
  const { scale, minX, minY } = minimapScale(frames, minimapSize);
  return {
    x: point.x / scale + minX,
    y: point.y / scale + minY,
    zoom: currentCamera.zoom,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvas-minimap` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-minimap.ts src/lib/utils/canvas-minimap.test.ts
git commit -m "feat: add canvas minimap projection"
```

---

## Task 5: Transitions & sequence stepping (TDD)

**Files:**
- Create: `src/lib/utils/canvas-transition.ts`
- Test: `src/lib/utils/canvas-transition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/canvas-transition.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  deriveTransition,
  interpolateCamera,
  easeInOutCubic,
  nextFrameId,
  prevFrameId,
} from './canvas-transition';
import type { Camera } from './canvas-camera';
import type { Sequence } from '../types/canvas';

describe('deriveTransition', () => {
  it('maps each legacy transition value', () => {
    expect(deriveTransition('zoom')).toEqual({ type: 'zoom-pan', durationMs: 800 });
    expect(deriveTransition('fade')).toEqual({ type: 'fade', durationMs: 400 });
    expect(deriveTransition('none')).toEqual({ type: 'instant', durationMs: 0 });
    expect(deriveTransition('slide')).toEqual({ type: 'zoom-pan', durationMs: 800 });
    expect(deriveTransition(undefined)).toEqual({ type: 'zoom-pan', durationMs: 800 });
  });
});

describe('easeInOutCubic', () => {
  it('pins the endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});

describe('interpolateCamera', () => {
  const from: Camera = { x: 0, y: 0, zoom: 1 };
  const to: Camera = { x: 100, y: 100, zoom: 4 };

  it('returns the endpoints at t=0 and t=1', () => {
    expect(interpolateCamera(from, to, 0)).toEqual({ x: 0, y: 0, zoom: 1 });
    const end = interpolateCamera(from, to, 1);
    expect(end.x).toBeCloseTo(100, 6);
    expect(end.y).toBeCloseTo(100, 6);
    expect(end.zoom).toBeCloseTo(4, 6);
  });

  it('interpolates zoom in log space (geometric midpoint with linear easing)', () => {
    const mid = interpolateCamera(from, to, 0.5, (t) => t); // linear easing
    expect(mid.zoom).toBeCloseTo(2, 6); // 1 * (4/1)^0.5
  });

  it('clamps t outside [0,1]', () => {
    expect(interpolateCamera(from, to, -1)).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('nextFrameId / prevFrameId', () => {
  const seq: Sequence = { id: 'main', name: 'Main', frameIds: ['a', 'b', 'c'] };

  it('steps forward and clamps at the end', () => {
    expect(nextFrameId(seq, 'a')).toBe('b');
    expect(nextFrameId(seq, 'c')).toBeNull();
  });

  it('steps backward and clamps at the start', () => {
    expect(prevFrameId(seq, 'b')).toBe('a');
    expect(prevFrameId(seq, 'a')).toBeNull();
  });

  it('returns null for an unknown frame id', () => {
    expect(nextFrameId(seq, 'x')).toBeNull();
    expect(prevFrameId(seq, 'x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module `./canvas-transition` cannot be resolved.

- [ ] **Step 3: Implement transitions**

Create `src/lib/utils/canvas-transition.ts`:
```typescript
import type { Camera } from './canvas-camera';
import type { Sequence } from '../types/canvas';
import type { PresentationSlide } from '../types/presentation';

/**
 * Render-time transition. Defined here (not on the persisted Frame) so the
 * foundation's slide<->canvas round-trip stays lossless.
 */
export interface FrameTransition {
  type: 'zoom-pan' | 'fade' | 'instant';
  durationMs: number;
}

/** Map the legacy slide transition union to a render-time FrameTransition. */
export function deriveTransition(legacy: PresentationSlide['transition']): FrameTransition {
  switch (legacy) {
    case 'zoom':
      return { type: 'zoom-pan', durationMs: 800 };
    case 'fade':
      return { type: 'fade', durationMs: 400 };
    case 'none':
      return { type: 'instant', durationMs: 0 };
    case 'slide':
    default:
      return { type: 'zoom-pan', durationMs: 800 };
  }
}

export type Easing = (t: number) => number;

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Interpolate a camera; x/y linear, zoom in log space for even perceptual zoom. */
export function interpolateCamera(
  from: Camera,
  to: Camera,
  t: number,
  easing: Easing = easeInOutCubic
): Camera {
  const e = easing(Math.max(0, Math.min(1, t)));
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, e),
  };
}

export function nextFrameId(sequence: Sequence, currentId: string): string | null {
  const i = sequence.frameIds.indexOf(currentId);
  if (i === -1 || i >= sequence.frameIds.length - 1) return null;
  return sequence.frameIds[i + 1];
}

export function prevFrameId(sequence: Sequence, currentId: string): string | null {
  const i = sequence.frameIds.indexOf(currentId);
  if (i <= 0) return null;
  return sequence.frameIds[i - 1];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `canvas-transition` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/canvas-transition.ts src/lib/utils/canvas-transition.test.ts
git commit -m "feat: add canvas transitions and sequence stepping"
```

---

## Task 6: Extract `ElementRenderer` from `SlideCanvas` (refactor)

This is a pure move with no behavior change, verified by typecheck + build (the element rendering has no unit tests today).

**Files:**
- Create: `src/components/app/presentation/editor/elements/ElementRenderer.tsx`
- Modify: `src/components/app/presentation/editor/SlideCanvas.tsx`

- [ ] **Step 1: Create the shared renderer**

Create `src/components/app/presentation/editor/elements/ElementRenderer.tsx`:
```tsx
import type { SlideElement } from '@/lib/types';
import { INTERACTIVE_ELEMENT_TYPES } from '@/lib/types';
import { TextElement } from './TextElement';
import { ImageElement } from './ImageElement';
import { ShapeElement } from './ShapeElement';
import { ConnectorElement } from './ConnectorElement';
import { InteractiveElement } from './InteractiveElement';
import { AIStepPreview } from './AIStepPreview';
import { ResultsElement } from './ResultsElement';

export const RESULTS_TYPES = [
  'quiz-results',
  'poll-results',
  'thoughts-results',
  'rating-results',
  'evaluation-results',
  'agentic-designer-results',
  'ai-step-results',
];
export const SPECIAL_TYPES = ['leaderboard', 'qa', 'spin-wheel'];

interface ElementRendererProps {
  element: SlideElement;
  isSelected: boolean;
  onSelect?: () => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  onUpdateContent?: (content: string) => void;
  onUploadImage?: () => void;
}

export function ElementRenderer({
  element,
  isSelected,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUpdateContent,
  onUploadImage,
}: ElementRendererProps) {
  if (element.type === 'text') {
    return (
      <TextElement
        element={element}
        isSelected={isSelected}
        isEditing={isEditing}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
        onUpdateContent={onUpdateContent}
      />
    );
  }
  if (element.type === 'image') {
    return <ImageElement element={element} onUpload={onUploadImage} />;
  }
  if (element.type === 'shape') {
    return <ShapeElement element={element} />;
  }
  if (element.type === 'connector') {
    return <ConnectorElement element={element} />;
  }
  if (element.type === 'ai-step') {
    return <AIStepPreview element={element} />;
  }
  if (INTERACTIVE_ELEMENT_TYPES.includes(element.type) || SPECIAL_TYPES.includes(element.type)) {
    return <InteractiveElement element={element} />;
  }
  if (RESULTS_TYPES.includes(element.type)) {
    return <ResultsElement element={element} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      {element.type}
    </div>
  );
}
```

- [ ] **Step 2: Remove the moved code from `SlideCanvas.tsx` and import the shared renderer**

In `src/components/app/presentation/editor/SlideCanvas.tsx`:

a) Delete these element-component import lines (they now live in `ElementRenderer.tsx`):
```tsx
import { TextElement } from './elements/TextElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { ConnectorElement } from './elements/ConnectorElement';
import { InteractiveElement } from './elements/InteractiveElement';
import { AIStepPreview } from './elements/AIStepPreview';
import { ResultsElement } from './elements/ResultsElement';
```
Keep the remaining element imports `SelectionOverlay` and `ConnectorSelectionOverlay` — `SlideCanvas` still uses them directly.

b) Add this import alongside the kept ones:
```tsx
import { ElementRenderer } from './elements/ElementRenderer';
```

c) Change the types import to drop the now-unused `INTERACTIVE_ELEMENT_TYPES` value import. The line:
```tsx
import { INTERACTIVE_ELEMENT_TYPES } from '@/lib/types';
```
should be **deleted** (it was only used by the moved `ElementRenderer`).

d) Delete the two module-level constants (now in `ElementRenderer.tsx`):
```tsx
const RESULTS_TYPES = ['quiz-results', 'poll-results', 'thoughts-results', 'rating-results', 'evaluation-results', 'agentic-designer-results', 'ai-step-results'];
const SPECIAL_TYPES = ['leaderboard', 'qa', 'spin-wheel'];
```

e) Delete the entire local `function ElementRenderer({ ... }) { ... }` definition (the block starting at `function ElementRenderer({` through its closing `}`). The JSX usage of `<ElementRenderer ... />` further down stays unchanged — it now resolves to the imported component.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no unused-import or missing-symbol errors. (If `SlideElementType` becomes unused in `SlideCanvas.tsx`, remove it from the type import to satisfy the compiler.)

- [ ] **Step 4: Verify the build still succeeds**

Run: `npm run build`
Expected: PASS — production build completes (proves the editor still compiles with the extracted renderer).

- [ ] **Step 5: Commit**

```bash
git add src/components/app/presentation/editor/elements/ElementRenderer.tsx src/components/app/presentation/editor/SlideCanvas.tsx
git commit -m "refactor: extract shared read-only ElementRenderer from SlideCanvas"
```

---

## Task 7: `FrameContent` and `FrameOverlay` components

**Files:**
- Create: `src/components/app/presentation/editor/FrameContent.tsx`
- Create: `src/components/app/presentation/editor/FrameOverlay.tsx`

- [ ] **Step 1: Create `FrameContent`**

Create `src/components/app/presentation/editor/FrameContent.tsx`:
```tsx
'use client';

import type { CSSProperties } from 'react';
import type { Frame } from '@/lib/types/canvas';
import type { SlideBackground } from '@/lib/types';
import { ElementRenderer } from './elements/ElementRenderer';

function backgroundStyle(background?: SlideBackground): CSSProperties {
  if (!background) return { backgroundColor: '#ffffff' };
  if (background.type === 'solid' && background.color) {
    return { backgroundColor: background.color };
  }
  if (background.type === 'gradient' && background.gradient) {
    return { background: background.gradient };
  }
  if (background.type === 'image' && background.imageUrl) {
    return {
      backgroundImage: `url(${background.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: '#ffffff' };
}

/** Renders a frame's elements read-only (no selection, drag, or resize). */
export function FrameContent({ frame }: { frame: Frame }) {
  const sorted = [...frame.elements].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div className="absolute inset-0 overflow-hidden" style={backgroundStyle(frame.background)}>
      {sorted.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            height: `${el.height}%`,
            zIndex: el.zIndex,
            opacity: el.opacity ?? 1,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
        >
          <ElementRenderer element={el} isSelected={false} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `FrameOverlay`**

Create `src/components/app/presentation/editor/FrameOverlay.tsx`:
```tsx
'use client';

import { cn } from '@/lib/utils';

/** Frame border + name badge. Purely visual; click-to-focus is handled by the wrapper. */
export function FrameOverlay({ name, active }: { name: string; active?: boolean }) {
  return (
    <>
      <div
        className={cn(
          'absolute -top-6 left-0 max-w-full truncate rounded px-1.5 py-0.5 text-xs',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {name}
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-sm border',
          active ? 'border-primary' : 'border-border'
        )}
      />
    </>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/presentation/editor/FrameContent.tsx src/components/app/presentation/editor/FrameOverlay.tsx
git commit -m "feat: add read-only FrameContent and FrameOverlay components"
```

---

## Task 8: `MiniMap` component

**Files:**
- Create: `src/components/app/presentation/editor/MiniMap.tsx`

- [ ] **Step 1: Create `MiniMap`**

Create `src/components/app/presentation/editor/MiniMap.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { projectMinimap, minimapPointToCamera } from '@/lib/utils/canvas-minimap';
import type { Camera, FrameBox, Viewport } from '@/lib/utils/canvas-camera';

const MINIMAP_SIZE = { width: 192, height: 128 };

interface MiniMapProps {
  frames: FrameBox[];
  camera: Camera;
  viewport: Viewport;
  onJump: (camera: Camera) => void;
}

export function MiniMap({ frames, camera, viewport, onJump }: MiniMapProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 right-4 rounded-md bg-background/90 p-2 shadow hover:bg-background"
        title="Show mini-map"
      >
        <MapIcon className="h-4 w-4" />
      </button>
    );
  }

  const { frameRects, viewportRect } = projectMinimap(frames, camera, viewport, MINIMAP_SIZE);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onJump(minimapPointToCamera(point, frames, viewport, MINIMAP_SIZE, camera));
  };

  return (
    <div className="absolute bottom-4 right-4 rounded-md bg-background/90 p-1.5 shadow">
      <div className="mb-1 flex items-center justify-between">
        <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Map</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-0.5 hover:bg-muted"
          title="Hide mini-map"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div
        className="relative cursor-pointer overflow-hidden rounded bg-muted/40"
        style={{ width: MINIMAP_SIZE.width, height: MINIMAP_SIZE.height }}
        onClick={handleClick}
      >
        {frameRects.map((r) => (
          <div
            key={r.id}
            className="absolute rounded-[1px] border border-muted-foreground/40 bg-muted-foreground/20"
            style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
          />
        ))}
        <div
          className="pointer-events-none absolute border-2 border-primary/80"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/presentation/editor/MiniMap.tsx
git commit -m "feat: add collapsible canvas mini-map component"
```

---

## Task 9: `use-canvas-navigation` hook

**Files:**
- Create: `src/hooks/presentation/use-canvas-navigation.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/presentation/use-canvas-navigation.ts`:
```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import type { Canvas, Sequence } from '@/lib/types/canvas';
import {
  clampZoom,
  fitAllFrames,
  fitFrame,
  panBy,
  zoomAtPoint,
  type Camera,
  type Point,
  type Viewport,
} from '@/lib/utils/canvas-camera';
import {
  deriveTransition,
  interpolateCamera,
  nextFrameId,
  prevFrameId,
  type FrameTransition,
} from '@/lib/utils/canvas-transition';

export function useCanvasNavigation(canvas: Canvas, sequenceId?: string) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastTransition, setLastTransition] = useState<FrameTransition | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);

  const sequence: Sequence | undefined =
    canvas.sequences.find((s) => s.id === (sequenceId ?? canvas.defaultSequenceId)) ??
    canvas.sequences[0];

  const cancelAnim = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  useEffect(() => () => cancelAnim(), [cancelAnim]);

  const animateTo = useCallback(
    (target: Camera, durationMs: number) => {
      cancelAnim();
      if (durationMs <= 0 || viewport.width === 0) {
        setCamera(target);
        return;
      }
      setIsAnimating(true);
      const startTime = performance.now();
      const from = camera;
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        setCamera(interpolateCamera(from, target, t));
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = null;
          setIsAnimating(false);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [camera, viewport.width, cancelAnim]
  );

  const pointInContainer = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const jumpTo = useCallback(
    (target: Camera) => {
      cancelAnim();
      setCamera(target);
    },
    [cancelAnim]
  );

  const fitAll = useCallback(() => {
    if (viewport.width === 0) return;
    cancelAnim();
    setCamera(fitAllFrames(canvas.frames, viewport));
    setCurrentFrameId(null);
  }, [canvas.frames, viewport, cancelAnim]);

  const goToFrame = useCallback(
    (frameId: string) => {
      const frame = canvas.frames.find((f) => f.id === frameId);
      if (!frame || viewport.width === 0) return;
      const target = fitFrame(frame, viewport);
      const transition = deriveTransition(frame.transition);
      setLastTransition(transition);
      setCurrentFrameId(frameId);
      if (transition.type === 'instant') {
        cancelAnim();
        setCamera(target);
      } else {
        animateTo(target, transition.durationMs);
      }
    },
    [canvas.frames, viewport, animateTo, cancelAnim]
  );

  const next = useCallback(() => {
    if (!sequence) return;
    if (currentFrameId == null) {
      if (sequence.frameIds[0]) goToFrame(sequence.frameIds[0]);
      return;
    }
    const id = nextFrameId(sequence, currentFrameId);
    if (id) goToFrame(id);
  }, [sequence, currentFrameId, goToFrame]);

  const prev = useCallback(() => {
    if (!sequence) return;
    if (currentFrameId == null) {
      if (sequence.frameIds[0]) goToFrame(sequence.frameIds[0]);
      return;
    }
    const id = prevFrameId(sequence, currentFrameId);
    if (id) goToFrame(id);
  }, [sequence, currentFrameId, goToFrame]);

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching }) => {
        if (pinching) return;
        cancelAnim();
        setCamera((c) => panBy(c, dx, dy));
      },
      onWheel: ({ delta: [dx, dy], event }) => {
        const we = event as WheelEvent;
        cancelAnim();
        if (we.ctrlKey || we.metaKey) {
          const p = pointInContainer(we.clientX, we.clientY);
          setCamera((c) => zoomAtPoint(c, p, c.zoom * Math.exp(-dy * 0.0015), viewport));
        } else {
          setCamera((c) => panBy(c, -dx, -dy));
        }
      },
      onPinch: ({ origin: [ox, oy], movement: [ms], first, memo }) => {
        cancelAnim();
        const base = first ? camera.zoom : (memo as number);
        const p = pointInContainer(ox, oy);
        setCamera((c) => zoomAtPoint(c, p, clampZoom(base * ms), viewport));
        return base;
      },
    },
    { wheel: { eventOptions: { passive: false } }, drag: { filterTaps: true } }
  );

  return {
    containerRef,
    bind,
    camera,
    viewport,
    setViewport,
    sequence,
    currentFrameId,
    isAnimating,
    lastTransition,
    goToFrame,
    next,
    prev,
    fitAll,
    jumpTo,
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no type errors. (`@use-gesture/react` ships its own types.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/presentation/use-canvas-navigation.ts
git commit -m "feat: add use-canvas-navigation hook (camera state, gestures, RAF)"
```

---

## Task 10: `InfiniteCanvas` component

**Files:**
- Create: `src/components/app/presentation/editor/InfiniteCanvas.tsx`

- [ ] **Step 1: Create `InfiniteCanvas`**

Create `src/components/app/presentation/editor/InfiniteCanvas.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import type { Canvas } from '@/lib/types/canvas';
import { Button } from '@/components/ui/button';
import { cameraToTransform } from '@/lib/utils/canvas-camera';
import { useCanvasNavigation } from '@/hooks/presentation/use-canvas-navigation';
import { FrameContent } from './FrameContent';
import { FrameOverlay } from './FrameOverlay';
import { MiniMap } from './MiniMap';

interface InfiniteCanvasProps {
  canvas: Canvas;
  sequenceId?: string;
  showMiniMap?: boolean;
  className?: string;
}

export function InfiniteCanvas({
  canvas,
  sequenceId,
  showMiniMap = true,
  className,
}: InfiniteCanvasProps) {
  const nav = useCanvasNavigation(canvas, sequenceId);
  const { setViewport, fitAll } = nav;
  const didFit = useRef(false);

  // Measure the viewport and keep it in sync with size changes.
  useEffect(() => {
    const el = nav.containerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [nav.containerRef, setViewport]);

  // Fit all frames once, as soon as the viewport size is known.
  useEffect(() => {
    if (!didFit.current && nav.viewport.width > 0) {
      didFit.current = true;
      fitAll();
    }
  }, [nav.viewport.width, fitAll]);

  const seqLen = nav.sequence?.frameIds.length ?? 0;
  const seqIndex =
    nav.currentFrameId && nav.sequence ? nav.sequence.frameIds.indexOf(nav.currentFrameId) : -1;

  return (
    <div
      ref={nav.containerRef}
      {...nav.bind()}
      className={`relative touch-none overflow-hidden bg-muted/20 ${className ?? ''}`}
    >
      {/* World container — one CSS transform IS the camera. */}
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: cameraToTransform(nav.camera, nav.viewport), transformOrigin: '0 0' }}
      >
        {canvas.frames.map((frame) => (
          <div
            key={frame.id}
            className="absolute cursor-pointer shadow-sm"
            style={{
              left: frame.canvasX,
              top: frame.canvasY,
              width: frame.width,
              height: frame.height,
            }}
            onClick={() => nav.goToFrame(frame.id)}
          >
            <FrameContent frame={frame} />
            <FrameOverlay name={frame.name} active={frame.id === nav.currentFrameId} />
          </div>
        ))}
      </div>

      {/* Fade transition: brief dim overlay (all frames are always visible, so no true cross-fade). */}
      {nav.lastTransition?.type === 'fade' && nav.isAnimating && (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-background/40" />
      )}

      {showMiniMap && nav.viewport.width > 0 && (
        <MiniMap
          frames={canvas.frames}
          camera={nav.camera}
          viewport={nav.viewport}
          onJump={nav.jumpTo}
        />
      )}

      {/* Minimal sequence nav controls. */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/90 px-2 py-1 shadow">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.prev} title="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {seqIndex >= 0 ? seqIndex + 1 : '–'}/{seqLen}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.next} title="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.fitAll} title="Fit all">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: PASS — production build completes with the new component compiled.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/presentation/editor/InfiniteCanvas.tsx
git commit -m "feat: add read-only InfiniteCanvas rendering component"
```

---

## Verification (whole plan)

- [ ] `npm test` — all suites pass: existing migration tests **plus** the new `canvas-camera`, `canvas-minimap`, `canvas-transition` tests.
- [ ] Confirm the foundation's round-trip migration tests still pass (no `Frame` data-model change was made).
- [ ] `npm run typecheck` — no type errors.
- [ ] `npm run build` — production build succeeds.
- [ ] Confirm the new layer is wired only to itself: `InfiniteCanvas` imports the hook + components + pure utils, and nothing outside this plan imports `InfiniteCanvas` yet (it stays dormant until plan #2).

```bash
# Dormant-layer check — expect no matches outside the editor dir / this component:
grep -rn "InfiniteCanvas" src --include="*.ts" --include="*.tsx" | grep -v "editor/InfiniteCanvas.tsx"
```

---

## Follow-on (not in scope here)

- **Plan #2 — Editor integration:** `use-canvas-state` (replacing `use-editor-state`), frames panel with sequence reorder, persistence (`getCanvas` on load / write `canvas` on save), and wiring `InfiniteCanvas` into `PresentationEditor` (or a route) for live visual verification.
- **Plan #3 — Consumer migration:** host present view, player view, analytics, AI functions read frames/sequence; true content cross-fade for the full-screen present view.
- **Plan #4 — Free-floating elements:** lift the "frames contain their elements" v1 simplification.
```
