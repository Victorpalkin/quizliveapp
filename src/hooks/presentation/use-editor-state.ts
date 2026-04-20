'use client';

import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type {
  PresentationSlide,
  SlideElement,
  SlideElementType,
  SlideBackground,
  PresentationSettings,
  PresentationTheme,
} from '@/lib/types';
import {
  computeAnchorPosition,
  computeConnectorBoundingBox,
} from '@/lib/utils/connector-paths';

const INTERACTIVE_TYPES: SlideElementType[] = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation'];

interface EditorState {
  slides: PresentationSlide[];
  currentSlideIndex: number;
  selectedElementId: string | null;
  selectedElementIds: string[];
  title: string;
  description: string;
  settings: PresentationSettings;
  theme: PresentationTheme;
  isDirty: boolean;
}

interface HistoryEntry {
  slides: PresentationSlide[];
  currentSlideIndex: number;
}

const DEFAULT_SETTINGS: PresentationSettings = {
  enableReactions: true,
  enableQA: true,
  enableStreaks: true,
  enableSoundEffects: true,
  defaultTimerSeconds: 20,
  pacingMode: 'free',
  pacingThreshold: 80,
};

const DEFAULT_THEME: PresentationTheme = {
  preset: 'default',
};

function createDefaultSlide(order: number): PresentationSlide {
  return {
    id: nanoid(),
    order,
    elements: [],
    background: { type: 'solid', color: '#ffffff' },
    transition: 'fade',
  };
}

/**
 * Update all connectors attached to a moved/resized element.
 * Recomputes endpoint positions and bounding boxes.
 */
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
    return {
      ...el,
      connectorConfig: newCfg,
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
  });
}

/**
 * Detach all connectors from a deleted element (keep connectors, remove attachments).
 */
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

export function useEditorState(initial?: {
  slides?: PresentationSlide[];
  title?: string;
  description?: string;
  settings?: PresentationSettings;
  theme?: PresentationTheme;
}) {
  const [state, setState] = useState<EditorState>({
    slides: initial?.slides?.length ? initial.slides : [createDefaultSlide(0)],
    currentSlideIndex: 0,
    selectedElementId: null,
    selectedElementIds: [],
    title: initial?.title || 'Untitled Presentation',
    description: initial?.description || '',
    settings: initial?.settings || { ...DEFAULT_SETTINGS },
    theme: initial?.theme || { ...DEFAULT_THEME },
    isDirty: false,
  });

  // Undo/redo stacks (two-stack approach for correctness)
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  // Version counter triggers re-renders when history changes
  const [historyVersion, setHistoryVersion] = useState(0);
  // Refs to read current state without stale closures
  const slidesRef = useRef(state.slides);
  const currentSlideIndexRef = useRef(state.currentSlideIndex);
  slidesRef.current = state.slides;
  currentSlideIndexRef.current = state.currentSlideIndex;

  // Drag state: prevents pushing history on every pixel during drag
  const isDraggingRef = useRef(false);
  // Debounce: prevents pushing history on every keystroke for property changes
  const lastHistoryPushRef = useRef(0);

  const pushHistory = useCallback(() => {
    undoStackRef.current.push({
      slides: JSON.parse(JSON.stringify(slidesRef.current)),
      currentSlideIndex: currentSlideIndexRef.current,
    });
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
    lastHistoryPushRef.current = Date.now();
  }, []);

  // Push history with 300ms debounce (for property panel changes)
  const pushHistoryDebounced = useCallback(() => {
    const now = Date.now();
    if (now - lastHistoryPushRef.current > 300) {
      pushHistory();
    }
  }, [pushHistory]);

  // Drag operation helpers
  const startDrag = useCallback(() => {
    pushHistory();
    isDraggingRef.current = true;
  }, [pushHistory]);

  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // --- Current slide helpers ---
  const currentSlide = state.slides[state.currentSlideIndex] || null;

  const selectedElement = currentSlide?.elements.find(
    (el) => el.id === state.selectedElementId
  ) || null;

  const selectedElements = currentSlide?.elements.filter(
    (el) => state.selectedElementIds.includes(el.id)
  ) || [];

  // --- Title/description ---
  const setTitle = useCallback((title: string) => {
    setState((s) => ({ ...s, title, isDirty: true }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((s) => ({ ...s, description, isDirty: true }));
  }, []);

  // --- Slide navigation ---
  const setCurrentSlideIndex = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      currentSlideIndex: Math.max(0, Math.min(index, s.slides.length - 1)),
      selectedElementId: null,
      selectedElementIds: [],
    }));
  }, []);

  // --- Slide CRUD ---
  const addSlide = useCallback((afterIndex?: number) => {
    pushHistory();
    setState((s) => {
      const insertAt = (afterIndex ?? s.currentSlideIndex) + 1;
      const newSlide = createDefaultSlide(insertAt);
      const newSlides = [...s.slides];
      newSlides.splice(insertAt, 0, newSlide);
      // Reorder
      newSlides.forEach((sl, i) => (sl.order = i));
      return {
        ...s,
        slides: newSlides,
        currentSlideIndex: insertAt,
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const duplicateSlide = useCallback((index: number) => {
    pushHistory();
    setState((s) => {
      const source = s.slides[index];
      if (!source) return s;
      const clone: PresentationSlide = JSON.parse(JSON.stringify(source));
      clone.id = nanoid();
      clone.elements.forEach((el) => (el.id = nanoid()));
      const newSlides = [...s.slides];
      newSlides.splice(index + 1, 0, clone);
      newSlides.forEach((sl, i) => (sl.order = i));
      return { ...s, slides: newSlides, currentSlideIndex: index + 1, isDirty: true };
    });
  }, [pushHistory]);

  const deleteSlide = useCallback((index: number) => {
    pushHistory();
    setState((s) => {
      if (s.slides.length <= 1) return s; // Keep at least one slide
      const newSlides = s.slides.filter((_, i) => i !== index);
      newSlides.forEach((sl, i) => (sl.order = i));
      const newIndex = Math.min(s.currentSlideIndex, newSlides.length - 1);
      return {
        ...s,
        slides: newSlides,
        currentSlideIndex: newIndex,
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    pushHistory();
    setState((s) => {
      const newSlides = [...s.slides];
      const [moved] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, moved);
      newSlides.forEach((sl, i) => (sl.order = i));
      return { ...s, slides: newSlides, currentSlideIndex: toIndex, isDirty: true };
    });
  }, [pushHistory]);

  const updateSlideBackground = useCallback((bg: SlideBackground) => {
    pushHistory();
    setState((s) => {
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...newSlides[s.currentSlideIndex],
        background: bg,
      };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  const updateSlideNotes = useCallback((notes: string) => {
    setState((s) => {
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...newSlides[s.currentSlideIndex],
        notes,
      };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, []);

  const updateSlideTransition = useCallback((transition: PresentationSlide['transition']) => {
    setState((s) => {
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...newSlides[s.currentSlideIndex],
        transition,
      };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, []);

  // --- Element CRUD ---
  const addElement = useCallback((type: SlideElementType, overrides?: Partial<SlideElement>) => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      // Check max 1 interactive element per slide
      if (INTERACTIVE_TYPES.includes(type)) {
        const hasInteractive = slide.elements.some((el) => INTERACTIVE_TYPES.includes(el.type));
        if (hasInteractive) return s; // Reject - already has one
      }

      const maxZ = slide.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

      // Default sizes based on type
      const defaults: Partial<SlideElement> = {
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
      }[type] || {};

      const newElement: SlideElement = {
        id: nanoid(),
        type,
        x: 10,
        y: 10,
        width: 40,
        height: 30,
        zIndex: maxZ + 1,
        ...defaults,
        // Default configs for interactive elements
        ...(type === 'text' && { content: '', fontSize: 24, textAlign: 'center' as const, color: '#000000' }),
        ...(type === 'shape' && { shapeType: 'rectangle' as const, backgroundColor: '#e2e8f0', borderColor: '#94a3b8', borderWidth: 2 }),
        ...(type === 'quiz' && {
          quizConfig: { question: 'Enter your question', answers: [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }], correctAnswerIndex: 0, timeLimit: 20, pointValue: 1000 },
        }),
        ...(type === 'poll' && {
          pollConfig: { question: 'Enter your question', options: [{ text: 'Option A' }, { text: 'Option B' }], allowMultiple: false },
        }),
        ...(type === 'thoughts' && {
          thoughtsConfig: { prompt: 'Share your thoughts...', maxPerPlayer: 3 },
        }),
        ...(type === 'rating' && {
          ratingConfig: { itemTitle: 'Rate this item', metricType: 'stars' as const, min: 1, max: 5, items: [] },
        }),
        ...(type === 'evaluation' && {
          evaluationConfig: {
            title: 'Evaluate items',
            items: [
              { id: nanoid(), text: 'Item 1' },
              { id: nanoid(), text: 'Item 2' },
            ],
            metrics: [
              { id: nanoid(), name: 'Rating', scaleType: 'stars' as const, scaleMin: 1, scaleMax: 5, weight: 1, lowerIsBetter: false },
            ],
          },
        }),
        ...(type === 'agentic-designer' && {
          x: 2, y: 5, width: 96, height: 90,
          agenticDesignerConfig: { target: 'Enter target industry or customer...', enablePlayerNudges: true },
        }),
        ...(type === 'ai-step' && {
          x: 2, y: 5, width: 96, height: 90,
          aiStepConfig: { stepPrompt: '', enablePlayerNudges: true },
        }),
        ...(type === 'leaderboard' && {
          leaderboardConfig: { maxDisplay: 10, showScores: true },
        }),
        ...(type === 'qa' && {
          qaConfig: { moderationEnabled: false },
        }),
        ...(type === 'spin-wheel' && {
          spinWheelConfig: { mode: 'players' as const },
        }),
        ...(type === 'connector' && {
          connectorConfig: {
            routingType: 'straight' as const,
            startX: 20, startY: 50, endX: 80, endY: 50,
            startArrow: 'none' as const,
            endArrow: 'arrow' as const,
            strokeColor: '#64748b',
            strokeWidth: 2,
            strokeStyle: 'solid' as const,
          },
        }),
        ...overrides,
      };

      // Compute bounding box from connector endpoints
      if (newElement.type === 'connector' && newElement.connectorConfig) {
        const cfg = newElement.connectorConfig;
        const bbox = computeConnectorBoundingBox(cfg.startX, cfg.startY, cfg.endX, cfg.endY);
        newElement.x = bbox.x;
        newElement.y = bbox.y;
        newElement.width = bbox.width;
        newElement.height = bbox.height;
      }

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...slide,
        elements: [...slide.elements, newElement],
      };

      return {
        ...s,
        slides: newSlides,
        selectedElementId: newElement.id,
        selectedElementIds: [newElement.id],
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<SlideElement>) => {
    // Push history for property changes (debounced), but not during drag
    if (!isDraggingRef.current) {
      pushHistoryDebounced();
    }
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      let newElements = slide.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );

      // If a non-connector element moved/resized, update attached connectors
      const movedElement = newElements.find((el) => el.id === elementId);
      if (movedElement && movedElement.type !== 'connector' &&
          ('x' in updates || 'y' in updates || 'width' in updates || 'height' in updates)) {
        newElements = updateAttachedConnectors(newElements, elementId);
      }

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistoryDebounced]);

  const updateElements = useCallback((elementIds: string[], updates: Partial<SlideElement>) => {
    pushHistoryDebounced();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      const newElements = slide.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, ...updates } : el
      );

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistoryDebounced]);

  const deleteElement = useCallback((elementId: string) => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      // Remove the element, then detach any connectors that were attached to it
      let remainingElements = slide.elements.filter((el) => el.id !== elementId);
      remainingElements = detachConnectorsFromElement(remainingElements, elementId);

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...slide,
        elements: remainingElements,
      };
      return {
        ...s,
        slides: newSlides,
        selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
        selectedElementIds: s.selectedElementIds.filter((id) => id !== elementId),
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const deleteElements = useCallback((elementIds: string[]) => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      let remainingElements = slide.elements.filter((el) => !elementIds.includes(el.id));
      for (const id of elementIds) {
        remainingElements = detachConnectorsFromElement(remainingElements, id);
      }

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...slide,
        elements: remainingElements,
      };
      return {
        ...s,
        slides: newSlides,
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const selectElement = useCallback((elementId: string | null) => {
    setState((s) => ({
      ...s,
      selectedElementId: elementId,
      selectedElementIds: elementId ? [elementId] : [],
    }));
  }, []);

  const toggleSelectElement = useCallback((elementId: string) => {
    setState((s) => {
      const ids = s.selectedElementIds.includes(elementId)
        ? s.selectedElementIds.filter((id) => id !== elementId)
        : [...s.selectedElementIds, elementId];
      return {
        ...s,
        selectedElementIds: ids,
        selectedElementId: ids.length > 0 ? ids[0] : null,
      };
    });
  }, []);

  // --- Z-order ---
  const bringToFront = useCallback(() => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || s.selectedElementIds.length === 0) return s;
      const maxZ = slide.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      let nextZ = maxZ + 1;
      const newElements = slide.elements.map((el) =>
        s.selectedElementIds.includes(el.id) ? { ...el, zIndex: nextZ++ } : el
      );
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  const sendToBack = useCallback(() => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || s.selectedElementIds.length === 0) return s;
      const minZ = slide.elements.reduce((min, el) => Math.min(min, el.zIndex), Infinity);
      let nextZ = minZ - s.selectedElementIds.length;
      const newElements = slide.elements.map((el) =>
        s.selectedElementIds.includes(el.id) ? { ...el, zIndex: nextZ++ } : el
      );
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  const moveForward = useCallback(() => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return s;
      const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((e) => e.id === s.selectedElementId);
      if (idx >= sorted.length - 1) return s;
      const swapTarget = sorted[idx + 1];
      const newElements = slide.elements.map((e) => {
        if (e.id === el.id) return { ...e, zIndex: swapTarget.zIndex };
        if (e.id === swapTarget.id) return { ...e, zIndex: el.zIndex };
        return e;
      });
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  const moveBackward = useCallback(() => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return s;
      const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((e) => e.id === s.selectedElementId);
      if (idx <= 0) return s;
      const swapTarget = sorted[idx - 1];
      const newElements = slide.elements.map((e) => {
        if (e.id === el.id) return { ...e, zIndex: swapTarget.zIndex };
        if (e.id === swapTarget.id) return { ...e, zIndex: el.zIndex };
        return e;
      });
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  // --- Clipboard (copy/paste/duplicate) ---
  const clipboardRef = useRef<SlideElement | null>(null);

  const copyElement = useCallback(() => {
    const slide = state.slides[state.currentSlideIndex];
    if (!slide || !state.selectedElementId) return;
    const el = slide.elements.find((e) => e.id === state.selectedElementId);
    if (el) clipboardRef.current = JSON.parse(JSON.stringify(el));
  }, [state.slides, state.currentSlideIndex, state.selectedElementId]);

  const pasteElement = useCallback(() => {
    if (!clipboardRef.current) return;
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;
      // Block pasting interactive element if slide already has one
      if (INTERACTIVE_TYPES.includes(clipboardRef.current!.type)) {
        const hasInteractive = slide.elements.some((el) => INTERACTIVE_TYPES.includes(el.type));
        if (hasInteractive) return s;
      }
      const maxZ = slide.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const pasted: SlideElement = {
        ...JSON.parse(JSON.stringify(clipboardRef.current)),
        id: nanoid(),
        x: Math.min((clipboardRef.current!.x || 0) + 3, 90),
        y: Math.min((clipboardRef.current!.y || 0) + 3, 90),
        zIndex: maxZ + 1,
      };
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: [...slide.elements, pasted] };
      return { ...s, slides: newSlides, selectedElementId: pasted.id, selectedElementIds: [pasted.id], isDirty: true };
    });
  }, [pushHistory]);

  const duplicateElement = useCallback(() => {
    const slide = state.slides[state.currentSlideIndex];
    const el = slide?.elements.find((e) => e.id === state.selectedElementId);
    if (!el) return;
    // Block duplicating interactive element if slide already has one
    if (INTERACTIVE_TYPES.includes(el.type)) {
      const hasInteractive = slide.elements.some((e) => e.id !== el.id && INTERACTIVE_TYPES.includes(e.type));
      if (hasInteractive) return;
    }
    pushHistory();
    setState((s) => {
      const currentSlide = s.slides[s.currentSlideIndex];
      if (!currentSlide) return s;
      const maxZ = currentSlide.elements.reduce((max, e) => Math.max(max, e.zIndex), 0);
      const dup: SlideElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: nanoid(),
        x: Math.min(el.x + 3, 90),
        y: Math.min(el.y + 3, 90),
        zIndex: maxZ + 1,
      };
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...currentSlide, elements: [...currentSlide.elements, dup] };
      return { ...s, slides: newSlides, selectedElementId: dup.id, selectedElementIds: [dup.id], isDirty: true };
    });
  }, [state.slides, state.currentSlideIndex, state.selectedElementId, pushHistory]);

  // --- Alignment ---
  const alignElement = useCallback((alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return s;
      const updates: Partial<SlideElement> = {};
      switch (alignment) {
        case 'left': updates.x = 0; break;
        case 'center-h': updates.x = (100 - el.width) / 2; break;
        case 'right': updates.x = 100 - el.width; break;
        case 'top': updates.y = 0; break;
        case 'center-v': updates.y = (100 - el.height) / 2; break;
        case 'bottom': updates.y = 100 - el.height; break;
      }
      const newElements = slide.elements.map((e) =>
        e.id === s.selectedElementId ? { ...e, ...updates } : e
      );
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, [pushHistory]);

  // --- Apply template ---
  const applyTemplate = useCallback((data: {
    slides: PresentationSlide[];
    settings: PresentationSettings;
    theme: PresentationTheme;
  }) => {
    pushHistory();
    setState((s) => ({
      ...s,
      slides: JSON.parse(JSON.stringify(data.slides)),
      settings: { ...data.settings },
      theme: { ...data.theme },
      currentSlideIndex: 0,
      selectedElementId: null,
      selectedElementIds: [],
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

  // --- Undo/Redo (two-stack approach) ---
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    // Save current state to redo stack
    redoStackRef.current.push({
      slides: JSON.parse(JSON.stringify(slidesRef.current)),
      currentSlideIndex: currentSlideIndexRef.current,
    });
    const entry = undoStackRef.current.pop()!;
    setHistoryVersion((v) => v + 1);
    setState((s) => ({
      ...s,
      slides: JSON.parse(JSON.stringify(entry.slides)),
      currentSlideIndex: entry.currentSlideIndex,
      selectedElementId: null,
      selectedElementIds: [],
      isDirty: true,
    }));
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    // Save current state to undo stack
    undoStackRef.current.push({
      slides: JSON.parse(JSON.stringify(slidesRef.current)),
      currentSlideIndex: currentSlideIndexRef.current,
    });
    const entry = redoStackRef.current.pop()!;
    setHistoryVersion((v) => v + 1);
    setState((s) => ({
      ...s,
      slides: JSON.parse(JSON.stringify(entry.slides)),
      currentSlideIndex: entry.currentSlideIndex,
      selectedElementId: null,
      selectedElementIds: [],
      isDirty: true,
    }));
  }, []);

  // Reactive canUndo/canRedo (historyVersion forces re-evaluation)
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;

  const markClean = useCallback(() => {
    setState((s) => ({ ...s, isDirty: false }));
  }, []);

  // Count interactive elements across all slides
  const interactiveElementCount = state.slides.reduce(
    (count, slide) => count + slide.elements.filter((el) => INTERACTIVE_TYPES.includes(el.type)).length,
    0
  );

  // Check if current slide has an interactive element
  const currentSlideHasInteractive = currentSlide?.elements.some(
    (el) => INTERACTIVE_TYPES.includes(el.type)
  ) || false;

  return {
    // State
    ...state,
    currentSlide,
    selectedElement,
    selectedElements,
    interactiveElementCount,
    currentSlideHasInteractive,
    canUndo,
    canRedo,

    // Metadata
    setTitle,
    setDescription,

    // Navigation
    setCurrentSlideIndex,

    // Slide operations
    addSlide,
    duplicateSlide,
    deleteSlide,
    reorderSlides,
    updateSlideBackground,
    updateSlideNotes,
    updateSlideTransition,

    // Element operations
    addElement,
    updateElement,
    updateElements,
    deleteElement,
    deleteElements,
    selectElement,
    toggleSelectElement,

    // Z-order
    bringToFront,
    sendToBack,
    moveForward,
    moveBackward,

    // Clipboard
    copyElement,
    pasteElement,
    duplicateElement,

    // Alignment
    alignElement,

    // Template
    applyTemplate,

    // Settings/Theme
    updateSettings,
    updateTheme,

    // History
    undo,
    redo,
    markClean,

    // Drag operations
    startDrag,
    endDrag,
  };
}
