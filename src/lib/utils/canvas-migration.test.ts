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
