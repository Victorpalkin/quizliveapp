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

const INTERACTIVE_TYPES: SlideElementType[] = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation'];

interface EditorState {
  slides: PresentationSlide[];
  currentSlideIndex: number;
  selectedElementId: string | null;
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
    title: initial?.title || 'Untitled Presentation',
    description: initial?.description || '',
    settings: initial?.settings || { ...DEFAULT_SETTINGS },
    theme: initial?.theme || { ...DEFAULT_THEME },
    isDirty: false,
  });

  // Undo/redo history
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback(() => {
    const entry: HistoryEntry = {
      slides: JSON.parse(JSON.stringify(state.slides)),
      currentSlideIndex: state.currentSlideIndex,
    };
    // Trim future history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(entry);
    historyIndexRef.current = historyRef.current.length - 1;
  }, [state.slides, state.currentSlideIndex]);

  // --- Current slide helpers ---
  const currentSlide = state.slides[state.currentSlideIndex] || null;

  const selectedElement = currentSlide?.elements.find(
    (el) => el.id === state.selectedElementId
  ) || null;

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
        leaderboard: { x: 10, y: 5, width: 80, height: 90 },
        qa: { x: 10, y: 10, width: 80, height: 70 },
        'spin-wheel': { x: 20, y: 10, width: 60, height: 80 },
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
        ...(type === 'text' && { content: 'Click to edit text', fontSize: 24, textAlign: 'center' as const, color: '#000000' }),
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
          ratingConfig: { itemTitle: 'Rate this item', metricType: 'stars' as const, min: 1, max: 5 },
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
        ...(type === 'leaderboard' && {
          leaderboardConfig: { maxDisplay: 10, showScores: true },
        }),
        ...(type === 'qa' && {
          qaConfig: { moderationEnabled: false },
        }),
        ...(type === 'spin-wheel' && {
          spinWheelConfig: { mode: 'players' as const },
        }),
        ...overrides,
      };

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...slide,
        elements: [...slide.elements, newElement],
      };

      return {
        ...s,
        slides: newSlides,
        selectedElementId: newElement.id,
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<SlideElement>) => {
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      const newElements = slide.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;

      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = {
        ...slide,
        elements: slide.elements.filter((el) => el.id !== elementId),
      };
      return {
        ...s,
        slides: newSlides,
        selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
        isDirty: true,
      };
    });
  }, [pushHistory]);

  const selectElement = useCallback((elementId: string | null) => {
    setState((s) => ({ ...s, selectedElementId: elementId }));
  }, []);

  // --- Z-order ---
  const bringToFront = useCallback(() => {
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const maxZ = slide.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const newElements = slide.elements.map((el) =>
        el.id === s.selectedElementId ? { ...el, zIndex: maxZ + 1 } : el
      );
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, []);

  const sendToBack = useCallback(() => {
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const minZ = slide.elements.reduce((min, el) => Math.min(min, el.zIndex), Infinity);
      const newElements = slide.elements.map((el) =>
        el.id === s.selectedElementId ? { ...el, zIndex: minZ - 1 } : el
      );
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: newElements };
      return { ...s, slides: newSlides, isDirty: true };
    });
  }, []);

  const moveForward = useCallback(() => {
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
  }, []);

  const moveBackward = useCallback(() => {
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
  }, []);

  // --- Clipboard (copy/paste/duplicate) ---
  const clipboardRef = useRef<SlideElement | null>(null);

  const copyElement = useCallback(() => {
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (el) clipboardRef.current = JSON.parse(JSON.stringify(el));
      return s;
    });
  }, []);

  const pasteElement = useCallback(() => {
    if (!clipboardRef.current) return;
    pushHistory();
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide) return s;
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
      return { ...s, slides: newSlides, selectedElementId: pasted.id, isDirty: true };
    });
  }, [pushHistory]);

  const duplicateElement = useCallback(() => {
    setState((s) => {
      const slide = s.slides[s.currentSlideIndex];
      if (!slide || !s.selectedElementId) return s;
      const el = slide.elements.find((e) => e.id === s.selectedElementId);
      if (!el) return s;
      pushHistory();
      const maxZ = slide.elements.reduce((max, e) => Math.max(max, e.zIndex), 0);
      const dup: SlideElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: nanoid(),
        x: Math.min(el.x + 3, 90),
        y: Math.min(el.y + 3, 90),
        zIndex: maxZ + 1,
      };
      const newSlides = [...s.slides];
      newSlides[s.currentSlideIndex] = { ...slide, elements: [...slide.elements, dup] };
      return { ...s, slides: newSlides, selectedElementId: dup.id, isDirty: true };
    });
  }, [pushHistory]);

  // --- Alignment ---
  const alignElement = useCallback((alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
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
  }, []);

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
    if (historyIndexRef.current < 0) return;
    const entry = historyRef.current[historyIndexRef.current];
    historyIndexRef.current--;
    setState((s) => ({
      ...s,
      slides: JSON.parse(JSON.stringify(entry.slides)),
      currentSlideIndex: entry.currentSlideIndex,
      selectedElementId: null,
      isDirty: true,
    }));
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 2) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current + 1];
    if (!entry) return;
    setState((s) => ({
      ...s,
      slides: JSON.parse(JSON.stringify(entry.slides)),
      currentSlideIndex: entry.currentSlideIndex,
      selectedElementId: null,
      isDirty: true,
    }));
  }, []);

  const canUndo = historyIndexRef.current >= 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 2;

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
    deleteElement,
    selectElement,

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
  };
}
