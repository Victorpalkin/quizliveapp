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
