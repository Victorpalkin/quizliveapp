# Canvas Editor Integration Design

**Status:** Approved (brainstorm) — ready for implementation planning.

**Parent spec:** `docs/superpowers/specs/2026-05-28-ai-adaptive-presentations-design.md` (Phase 1A: Canvas Editor).

**Builds on:**
- `docs/superpowers/plans/2026-05-28-canvas-data-model-foundation.md` — `Canvas`/`Frame`/`Sequence` types + `slidesToCanvas`/`canvasToSlides`/`getCanvas`.
- `docs/superpowers/specs/2026-05-29-infinite-canvas-rendering-design.md` — the read-only `InfiniteCanvas` rendering layer (pan/zoom, frame contents, mini-map, sequence navigation) and `use-canvas-navigation`.

This is **follow-on plan #2** (Editor integration): make the editor work on the `Canvas` model end-to-end.

---

## Goal

Make the presentation editor **canvas-native**: the `Canvas` becomes the editor's source of truth, persisted to Firestore; the editor opens on the spatial **overview** (the read-only `InfiniteCanvas` we built) and lets the user enter a frame to edit it with the existing single-frame WYSIWYG surface. A sequence-aware **Frames panel** replaces the slide panel.

## Key constraint that shapes the design

In the **v1 data model a frame is isomorphic to a slide** — frames *contain* their elements at frame-relative percentage coordinates (free-floating, cross-frame elements arrive in plan #4). Therefore the existing single-frame editor (`SlideCanvas`, with drag/resize/snap/multi-select/connectors) maps 1:1 onto "editing one frame" and is **kept as-is**. We do **not** rebuild editing on the infinite plane in this plan.

## Decisions (from brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Canvas state + persistence + Frames panel + overview; keep `SlideCanvas` for single-frame editing | Tractable in one plan; respects the v1 model. |
| Edit model | **Overview-default, click-to-edit** | Editor opens on the infinite canvas of all frames; **double-click** a frame to edit it (single-click selects/focuses; drag repositions). |
| State strategy | Canvas is the source of truth; a **pure `canvas-ops` module** + a thin `use-canvas-state` hook; **remove `use-editor-state`** | Real logic is node-testable; the hook is a thin shell (matches plan-#1 testing philosophy). An adapter over `use-editor-state` was rejected because slides can't persist per-frame `canvasX/canvasY`. |
| Panel reorder | **Sequence order only**; spatial positions preserved | Decoupling navigation order from spatial layout is the core canvas concept. |
| Persistence | **Dual-write** `canvas` (source of truth) **+** `slides = canvasToSlides(canvas)` | Keeps the 6 existing `slides` readers working until plan #3 migrates them. |

## Non-goals (deferred)

- **Multiple sequences** — the editor manages only the default sequence (multi-sequence is a later/Phase-3 concern).
- **Free-floating / cross-frame elements** — plan #4.
- **Migrating present view / player / analytics / AI functions to read frames** — plan #3 (this plan keeps `slides` in sync for them).
- **Editing element geometry directly on the infinite plane** — editing happens inside a single frame; only *frame* position is editable on the overview.

---

## Architecture

### File map

| File | Responsibility |
|------|----------------|
| `src/lib/utils/canvas-ops.ts` (create) + `.test.ts` | **Pure**, node-tested Canvas operations. |
| `src/hooks/presentation/use-canvas-state.ts` (create) | Thin hook: editor state + undo/redo; delegates mutations to `canvas-ops`. |
| `src/firebase/presentation/use-presentation.ts` (modify) | Load + persist the `canvas` field. |
| `src/components/app/presentation/editor/FramesPanel.tsx` (create) | Sequence-aware frame thumbnails (reuses `SlideThumbnail`). |
| `src/components/app/presentation/editor/PresentationEditor.tsx` (modify) | Switch to `use-canvas-state`; overview/edit modes; load via `getCanvas`; dual-write. |
| `src/components/app/presentation/editor/InfiniteCanvas.tsx` (modify) | Opt-in editing props; read-only by default. |
| `src/hooks/presentation/use-editor-state.ts` (delete) | Dead after the switch (only `PresentationEditor` used it). |
| `src/components/app/presentation/editor/SlidePanel.tsx` (delete) | Replaced by `FramesPanel` (only `PresentationEditor` used it). |

### `canvas-ops.ts` (pure)

All take a `Canvas` (plus args) and return a **new** `Canvas` (immutable). They never touch React or the DOM.

**Frame / sequence operations:**
- `addFrame(canvas, opts?): { canvas, frameId }` — new frame auto-positioned to the right of the rightmost frame (`maxCanvasX + width + FRAME_GAP`, `canvasY = 0`), default 16:9 size, empty elements, default background/transition, named `Frame N`; appended to the default sequence.
- `duplicateFrame(canvas, frameId): { canvas, frameId }` — deep clone (new frame id + new element ids), offset position, inserted into the default sequence right after the source.
- `deleteFrame(canvas, frameId): Canvas` — remove the frame and its references from all sequences; never delete the last remaining frame.
- `moveFrame(canvas, frameId, canvasX, canvasY): Canvas` — set absolute position (overview drag).
- `reorderSequence(canvas, sequenceId, fromIndex, toIndex): Canvas` — reorder `frameIds` of the given sequence (default sequence in this plan); **spatial positions untouched**.
- `renameFrame`, `updateFrameBackground`, `updateFrameNotes`, `updateFrameTransition`.

**Per-frame element operations** (ported from `use-editor-state`, retargeted to a `frameId`): `addElement`, `updateElement`, `updateElements`, `deleteElement`, `deleteElements`, `bringToFront`, `sendToBack`, `moveForward`, `moveBackward`, `alignElement`, `pasteElement`, `duplicateElement` — including the existing connector attach/detach recomputation and the "max one interactive element per frame" rule.

### `use-canvas-state.ts` (thin hook)

State: `{ canvas: Canvas, currentFrameId: string | null, selectedElementId, selectedElementIds, title, description, settings, theme, isDirty, mode: 'overview' | 'edit' }` + undo/redo stacks over `Canvas` snapshots.

Derived: `currentFrame` (the frame whose id is `currentFrameId`), `selectedElement(s)`, `defaultSequence`, `framesInSequenceOrder`, `interactiveElementCount`, `currentFrameHasInteractive`, `canUndo/canRedo`.

API mirrors what `PresentationEditor` / `SlideCanvas` / `PropertiesPanel` already consume (so those change minimally) — element ops, z-order, clipboard, align, settings/theme, undo/redo, `startDrag`/`endDrag` — with `currentFrame` substituted for `currentSlide`. Adds: `setCurrentFrameId`, `setMode`, `enterFrame(frameId)` (sets current + `mode='edit'`), `exitToOverview()`, `addFrame`, `duplicateFrame`, `deleteFrame`, `reorderSequence`, `moveFrame`, `renameFrame`, `updateFrameBackground/Notes/Transition`. All mutations delegate to `canvas-ops`; undo/redo snapshot the whole `Canvas`.

### Persistence (`use-presentation.ts`)

- `docToPresentation` returns `canvas: data.canvas as Canvas | undefined` (currently dropped).
- `updatePresentation` accepts `canvas` in its `data` type; `createPresentation` writes an initial `canvas` alongside `slides`.
- `PresentationEditor`:
  - **Load:** `getCanvas(presentation)` → initial canvas for `use-canvas-state`.
  - **Save (dual-write):** `updatePresentation(id, { canvas, slides: canvasToSlides(canvas), title, description, settings, theme })`. `removeUndefined` already strips empties. Auto-save (30s) and the unsaved-changes warning behave as today, now keyed on canvas dirtiness.

### Editor modes (`PresentationEditor.tsx`)

- **overview** (default): renders `InfiniteCanvas` over the full canvas with editing props enabled — single-click selects/focuses a frame, **double-click enters edit** (`enterFrame`), dragging a frame calls `moveFrame`. `FramesPanel` is visible; the properties flyout can show frame properties for the selected frame.
- **edit**: renders the existing `SlideCanvas` bound to `currentFrame`; a "← Overview" control and `Esc` return to overview. Toolbar, Elements/AI/Configure panels, and the properties flyout operate on the current frame exactly as today.
- **read-only** (`view` page, `readOnly` prop): overview renders read-only (editing props omitted → plan-#1 behavior); double-click just focuses, no edit; no `FramesPanel` mutations.

### `InfiniteCanvas.tsx` (opt-in editing)

Add **optional** props — when omitted, behavior is identical to plan #1 (read-only):
- `selectedFrameId?: string`
- `onFrameActivate?(frameId): void` — wired to double-click (enter edit).
- `onFrameMove?(frameId, canvasX, canvasY): void` — enables drag-to-reposition (pointer drag on a frame translates `canvasX/Y` in world units; suppressed while panning).
Single-click keeps focusing the frame (existing `goToFrame`) and, when `onFrameActivate`/selection is provided, also sets the selected frame.

### `FramesPanel.tsx`

Replaces `SlidePanel`. Renders frame thumbnails **in default-sequence order** (reusing `SlideThumbnail` with a frame→slide-shaped adapter), each showing interactive-type badges. Drag-to-reorder calls `reorderSequence`. Context actions: add frame, duplicate, delete, rename. Selecting a thumbnail sets the current frame (and double-click enters edit); the active frame is highlighted.

---

## Testing strategy

- `canvas-ops.test.ts` (node): every operation — `addFrame` positioning + sequence append, `duplicateFrame` id-freshness + sequence insertion, `deleteFrame` reference cleanup + last-frame guard, `moveFrame`, `reorderSequence` (sequence-only, positions preserved), the per-frame element ops (incl. interactive-limit and connector attach/detach), and a **consistency check** that `canvasToSlides(canvas)` after a series of edits yields slides in sequence order matching the frames.
- Hook + components (`use-canvas-state`, `FramesPanel`, editor mode wiring, `InfiniteCanvas` editing props) verified by `npm run typecheck` + `npm run build`, consistent with the plan-#1 split.
- Plan-#1 pure tests and the foundation migration tests must stay green.

## Risks & mitigations

- **Higher-risk than plan #1** (rewrites the editor's state backbone). Mitigation: keep `SlideCanvas` and the per-frame editing API surface unchanged so the diff in editing behavior is minimal; concentrate change in state/persistence/panel/mode wiring; lean on the node-tested `canvas-ops` for the new logic.
- **Backward compatibility for `slides` readers.** Mitigation: dual-write keeps `slides` authoritative-in-order for the 6 existing readers until plan #3.
- **Legacy presentations (no `canvas`).** Mitigation: `getCanvas` derives one from `slides` on load; first save persists `canvas`.
- **Removing `use-editor-state`/`SlidePanel`.** Safe — both are used only by `PresentationEditor`; verify with a grep before deletion.

## Success criteria

1. Opening a presentation shows the spatial overview of all frames; double-clicking a frame edits it with the existing tools; "← Overview"/Esc returns.
2. Dragging a frame on the overview persists its `canvasX/canvasY`.
3. The Frames panel lists frames in sequence order, shows interactive badges, and drag-reorder changes only navigation order (positions preserved).
4. Save writes both `canvas` and `slides`; reloading restores the canvas (including frame positions); legacy slide-only presentations open and, after save, gain a `canvas`.
5. `canvas-ops` is fully node-tested and green; `npm run typecheck` and `npm run build` pass; plan-#1 and foundation tests stay green.
6. The read-only `view` page still renders (now as the read-only overview).
