import { describe, it, expect } from 'vitest';
import { slidesToCanvas, canvasToSlides } from './canvas-migration';
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
  FRAME_GAP,
  DEFAULT_SEQUENCE_ID,
} from '../types/canvas';
import type { PresentationSlide } from '../types/presentation';
import type { Canvas } from '../types/canvas';

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
