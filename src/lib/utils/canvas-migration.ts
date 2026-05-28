import type { PresentationSlide, Presentation } from '../types/presentation';
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

/**
 * Always return a Canvas for a presentation: the stored `canvas` if
 * present, otherwise one derived from the legacy `slides` array.
 */
export function getCanvas(presentation: Presentation): Canvas {
  return presentation.canvas ?? slidesToCanvas(presentation.slides);
}
