# Infinite Canvas Rendering Design

**Status:** Approved (brainstorm) — ready for implementation planning.

**Parent spec:** `docs/superpowers/specs/2026-05-28-ai-adaptive-presentations-design.md` (Phase 1A: Canvas Editor).

**Builds on:** `docs/superpowers/plans/2026-05-28-canvas-data-model-foundation.md` (the `Canvas`/`Frame`/`Sequence` types and `slidesToCanvas` / `canvasToSlides` / `getCanvas` migration helpers — currently dormant).

This is **follow-on plan #1** from the foundation plan: *Infinite canvas rendering — an `InfiniteCanvas` component with pan/zoom, frame overlays, mini-map; richer `FrameTransition` (zoom-pan + durationMs).*

---

## Goal

Build a **read-only** infinite-canvas rendering layer that displays a `Canvas` (all frames laid out at their absolute `canvasX/canvasY`) on a zoomable, pannable 2D plane, with frame contents, frame overlays, a collapsible mini-map, and animated camera navigation along a sequence.

The bulk of the real logic lives in **pure, node-testable functions** (camera math, mini-map projection, transition interpolation, sequence stepping). The React layer is a thin shell.

## Non-goals (explicitly deferred)

- **No route and no editor wiring.** The component stays dormant until follow-on #2 (editor integration) imports it. Verification this plan is via unit tests on the pure layer.
- **No editing interactions** — no drag, resize, selection, snap guides, or context menus on the canvas. Read-only only.
- **No `Frame` data-model change.** `Frame.transition` keeps the legacy union (`'fade' | 'slide' | 'zoom' | 'none'`) so the foundation's round-trip migration stays lossless. The richer transition is a *render-time* concept derived from that field.
- **No free-floating elements.** The v1 simplification (frames contain their elements, percentage coords) is preserved; lifting it is follow-on #4.

## Key decisions (from brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Surface | Component + pure-logic tests only; no route | Lowest footprint; real visual verification arrives with the #2 route. |
| Capabilities | Frame contents, free pan+zoom, collapsible mini-map, sequence navigation + transitions | Full read-only rendering surface. |
| Test infra | Pure node tests, no new test deps; thin untested shell | Keeps the existing node-only Vitest setup; concentrates logic where it is cheap to test. |
| Rendering tech | Bespoke single-CSS-transform "world" container + `@use-gesture/react` for input | We own the camera math (so it stays pure and testable); matches the existing `SlideCanvas` CSS-transform idiom; one small *gesture-primitive* dep that does **not** own camera state. A full canvas library (React Flow / react-zoom-pan-pinch) was rejected: it would own the viewport (gutting the pure-logic test plan), add a heavy dep, and not reduce the #2 editor work given the existing bespoke HTML editing model. |
| Element rendering | Extract the existing private `ElementRenderer` from `SlideCanvas` into a shared read-only component | Avoids duplicating the ~40-line type switch; pure move, no behavior change. |
| Next/Prev controls | Included in this read-only component | Part of the sequence-navigation capability; exercises `FrameTransition`. |

---

## Architecture

### Module map

**Pure logic — `src/lib/utils/` (no DOM, node-tested):**

- `canvas-camera.ts` — camera model, world↔screen transforms, fit/zoom/pan math.
- `canvas-minimap.ts` — mini-map projection and click-to-camera.
- `canvas-transition.ts` — render-time `FrameTransition`, legacy-transition derivation, camera interpolation, sequence stepping.

**Thin React shell (untested by design; verified visually in #2):**

- `src/hooks/presentation/use-canvas-navigation.ts` — camera state, RAF animation loop, `@use-gesture/react` wiring to the pure functions.
- `src/components/app/presentation/editor/InfiniteCanvas.tsx` — viewport + world container; renders frames, overlays, mini-map, Next/Prev controls; read-only.
- `src/components/app/presentation/editor/FrameContent.tsx` — renders one frame's elements read-only.
- `src/components/app/presentation/editor/FrameOverlay.tsx` — frame border + name badge + click-to-focus target.
- `src/components/app/presentation/editor/MiniMap.tsx` — corner mini-map, collapsible.
- `src/components/app/presentation/editor/elements/ElementRenderer.tsx` — **extracted** shared read-only element renderer (moved out of `SlideCanvas.tsx`).

### Data flow

```
Canvas (frames + sequences)
   │
   ▼
InfiniteCanvas ──uses──► use-canvas-navigation ──calls──► pure camera/transition fns
   │                          │ (camera state, RAF)
   │ renders                  │ @use-gesture (drag/wheel/pinch)
   ▼
world container (cameraToTransform)
   ├─ Frame (abs world px) ─► FrameContent (elements, %) + FrameOverlay
   └─ ...
MiniMap (projectMinimap) ── click ──► minimapPointToCamera
Next/Prev / frame click ──► goToFrame ──► RAF interpolateCamera ──► fitFrame(target)
```

---

## Pure logic specification

### `canvas-camera.ts`

`Camera = { x: number; y: number; zoom: number }`, where `(x, y)` is the **world coordinate displayed at the viewport center** and `zoom` is the scale factor. `Viewport = { width: number; height: number }`.

- `worldToScreen(point, camera, viewport): {x, y}` — `screen = (world - camera) * zoom + viewportCenter`.
- `screenToWorld(point, camera, viewport): {x, y}` — exact inverse.
- `cameraToTransform(camera, viewport): string` — the CSS transform for the world container: `translate(vw/2px, vh/2px) scale(zoom) translate(-x px, -y px)`.
- `fitFrame(frame, viewport, paddingRatio = 0.1): Camera` — center on the frame; `zoom = clampZoom(min(vw·(1−paddingRatio)/w, vh·(1−paddingRatio)/h))`. (Padding is a viewport-fraction margin, not world px.)
- `fitAllFrames(frames, viewport, paddingRatio = 0.1): Camera` — bounding box of all frames; center + zoom to fit using the same fraction-margin formula. Single frame → same as `fitFrame`. Empty frames → fallback `{ x: 0, y: 0, zoom: 1 }`.
- `zoomAtPoint(camera, screenPoint, newZoom, viewport): Camera` — apply `clampZoom(newZoom)` while keeping the world point under `screenPoint` fixed on screen.
- `panBy(camera, dxScreen, dyScreen): Camera` — `camera.x -= dx/zoom; camera.y -= dy/zoom`.
- `clampZoom(zoom, min = 0.1, max = 4): number`.

### `canvas-minimap.ts`

- `MinimapRect = { id?: string; x: number; y: number; width: number; height: number }`.
- `projectMinimap(frames, camera, viewport, minimapSize): { frameRects: MinimapRect[]; viewportRect: MinimapRect }` — fit the world bbox of all frames into `minimapSize` (preserving aspect); project every frame and the current visible world rect into minimap pixels.
- `minimapPointToCamera(point, frames, viewport, minimapSize, currentCamera): Camera` — inverse: a click in the mini-map yields the camera centered on that world location, **preserving the current zoom**.

### `canvas-transition.ts`

- `FrameTransition = { type: 'zoom-pan' | 'fade' | 'instant'; durationMs: number }` — **render-time only**, defined here, never persisted on `Frame`.
- `deriveTransition(legacy: PresentationSlide['transition']): FrameTransition` — `'zoom' → {zoom-pan, 800}`, `'fade' → {fade, 400}`, `'none' → {instant, 0}`, `'slide' | undefined → {zoom-pan, 800}` (default).
- `interpolateCamera(from, to, t, easing?): Camera` — `x`/`y` lerp linearly; **`zoom` lerps in log space** (`from.zoom * (to.zoom/from.zoom) ** t`) for perceptually even zoom; default easing `easeInOutCubic`; guarantees `t=0 → from`, `t=1 → to`.
- `nextFrameId(sequence, currentId): string | null` and `prevFrameId(sequence, currentId): string | null` — step through `sequence.frameIds`; clamp at the ends (return `null`), no wraparound; `currentId` not found → `null`.

---

## React shell specification

### `use-canvas-navigation(canvas, sequenceId?)`

State: `camera: Camera`, `isAnimating: boolean`. Returns:

- `camera`, and a ref/binder for the viewport element + its measured size.
- `panBy(dx, dy)`, `zoomAtPoint(screenPoint, newZoom)` — set state via the pure fns.
- `fitAll()`, `goToFrame(frameId, transition?)` — `goToFrame` targets `fitFrame(targetFrame)` and renders the transition per its `type` (see below).
  - `instant` → set the camera immediately, no animation.
  - `zoom-pan` → a `requestAnimationFrame` loop interpolating `camera` from current to target over `durationMs` via `interpolateCamera`.
  - `fade` → identical camera interpolation **plus** a brief full-viewport dim overlay that fades out→in during the move. (A true content cross-fade is meaningless here because all frames are simultaneously visible on the plane; a real cross-fade belongs to the full-screen present view, deferred to #3.)
- `next()`, `prev()` — resolve via `nextFrameId`/`prevFrameId` over the active sequence, then `goToFrame` with that frame's `deriveTransition`.
- `@use-gesture/react` bindings: drag → `panBy`; `ctrl/⌘ + wheel` → `zoomAtPoint` at cursor; plain wheel → `panBy`; pinch → `zoomAtPoint` at the pinch center.

The RAF loop and gesture binding are the only non-trivial untested glue, kept deliberately minimal.

### `InfiniteCanvas`

Props: `canvas: Canvas`, `sequenceId?: string` (default `canvas.defaultSequenceId`), `showMiniMap?: boolean` (default `true`), `className?`.

> **As-built note:** this plan implements the read-only component with the props above and always fits-all once on mount. The originally-sketched `theme: PresentationTheme` and `initialFit?: 'all' | { frameId }` props were deferred — frame backgrounds come from `frame.background` (not the theme), and a configurable initial fit isn't needed until the editor wires this in. Plan #2 (editor integration) can add `theme` threading and `initialFit` when real consumers need them.

Behavior:

- Measures the viewport via `ResizeObserver`; performs a one-time fit-all once the viewport size is known (does not re-fit on resize — the user can pan/zoom freely).
- Renders an `overflow-hidden` viewport containing the world container styled with `cameraToTransform(camera, viewport)`.
- For each frame: an absolutely-positioned box at `left: canvasX, top: canvasY, width, height` (world px) holding the frame background, `FrameContent`, and `FrameOverlay`.
- Renders `MiniMap` (when enabled) and minimal Next/Prev controls + a "frame i/N in <sequence>" status readout.
- Read-only: no drag/resize/selection on elements.

### `FrameContent`

Renders `frame.elements` sorted by `zIndex`, each positioned by percentage (`left/top/width/height` in %), via the shared `ElementRenderer` in read-only mode. Mirrors `SlideCanvas`'s element rendering minus all interaction.

### `FrameOverlay`

Absolutely-positioned border + a name badge above the frame; clicking calls `goToFrame(frame.id)`.

### `MiniMap`

Uses `projectMinimap` to draw frame rects + the current viewport rect; click maps via `minimapPointToCamera`. Collapsible (collapsed state in local component state).

### `ElementRenderer` (extraction)

Move the existing private `ElementRenderer` switch (and the `RESULTS_TYPES` / `SPECIAL_TYPES` constants) out of `SlideCanvas.tsx` into `elements/ElementRenderer.tsx`, exported for reuse. `SlideCanvas` imports it instead of its local copy — a pure refactor with no behavior change. `FrameContent` consumes it read-only.

---

## Testing strategy (node, pure only)

No component/DOM tests (per the test-infra decision). Vitest stays node-only; `@use-gesture/react` is a runtime dep, not a test dep.

- `canvas-camera.test.ts` — `worldToScreen`/`screenToWorld` round-trip; `cameraToTransform` string; `fitFrame` centering + zoom; `fitAllFrames` bbox (multi-frame, single-frame, empty fallback); `zoomAtPoint` cursor-anchor invariant (world point under cursor unchanged); `clampZoom` bounds; `panBy` scaling by zoom.
- `canvas-minimap.test.ts` — `projectMinimap` rects inside `minimapSize`, viewport rect correctness; `minimapPointToCamera` inverse of the projection center.
- `canvas-transition.test.ts` — `deriveTransition` mappings for every legacy value incl. `undefined`; `interpolateCamera` endpoints (`t=0`, `t=1`) and monotonic log-space zoom; `nextFrameId`/`prevFrameId` including end-clamping and not-found.

---

## Dependencies

- Add `@use-gesture/react` (runtime). Gesture-primitive library only — it normalizes pointer/wheel/pinch input into deltas and does **not** own camera/viewport state.

## Risks & mitigations

- **Gesture feel (trackpad/pinch/zoom-at-cursor).** Mitigated by `@use-gesture/react` for input normalization while keeping camera math ours.
- **Dormant-code drift** (the layer has no consumer until #2). Mitigated by thorough pure-logic tests that pin the contract the #2 integration will rely on.
- **`SlideCanvas` extraction regressions.** Mitigated by keeping it a pure move (no behavior change) and confirming `npm run build` + `npm run typecheck` still pass.

## Success criteria

1. Pure camera/minimap/transition functions exist with full unit-test coverage, all green under `npm test`.
2. `InfiniteCanvas` renders all frames at their world positions with real element content, pans/zooms smoothly, shows a working collapsible mini-map, and animates Next/Prev + frame-click navigation along the default sequence using the derived `FrameTransition`.
3. `Frame` data model is unchanged; the foundation's round-trip migration tests still pass.
4. `npm run typecheck` and `npm run build` succeed; the `SlideCanvas` extraction introduces no behavior change.
