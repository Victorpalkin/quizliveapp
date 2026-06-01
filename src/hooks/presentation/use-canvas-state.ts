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
      return {
        ...s,
        canvas,
        currentFrameId: stillCurrent ? s.currentFrameId : null,
        mode: stillCurrent ? s.mode : 'overview',
        selectedElementId: stillCurrent ? s.selectedElementId : null,
        selectedElementIds: stillCurrent ? s.selectedElementIds : [],
        isDirty: true,
      };
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
