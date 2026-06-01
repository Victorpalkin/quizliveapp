import { nanoid } from 'nanoid';
import type { Canvas, Frame } from '../types/canvas';
import { FRAME_WIDTH, FRAME_HEIGHT, FRAME_GAP, DEFAULT_SEQUENCE_ID } from '../types/canvas';
import type { SlideBackground } from '../types/presentation';

/** A fresh canvas with a single empty frame and a default sequence. */
export function createDefaultCanvas(): Canvas {
  const id = nanoid();
  return {
    frames: [
      {
        id,
        name: 'Frame 1',
        canvasX: 0,
        canvasY: 0,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        elements: [],
        background: { type: 'solid', color: '#ffffff' },
        transition: 'fade',
      },
    ],
    sequences: [{ id: DEFAULT_SEQUENCE_ID, name: 'Main', frameIds: [id] }],
    defaultSequenceId: DEFAULT_SEQUENCE_ID,
  };
}

/** Map a single frame by id, returning a new Canvas. */
function mapFrame(canvas: Canvas, frameId: string, fn: (frame: Frame) => Frame): Canvas {
  return { ...canvas, frames: canvas.frames.map((f) => (f.id === frameId ? fn(f) : f)) };
}

/** Insert frameId into the default sequence, optionally right after another frame. */
function insertIntoDefaultSequence(canvas: Canvas, frameId: string, afterFrameId?: string): Canvas['sequences'] {
  return canvas.sequences.map((seq) => {
    if (seq.id !== canvas.defaultSequenceId) return seq;
    const ids = [...seq.frameIds];
    if (afterFrameId) {
      const i = ids.indexOf(afterFrameId);
      if (i >= 0) ids.splice(i + 1, 0, frameId);
      else ids.push(frameId);
    } else {
      ids.push(frameId);
    }
    return { ...seq, frameIds: ids };
  });
}

/** Add a new empty frame to the right of the rightmost frame; append to the default sequence. */
export function addFrame(canvas: Canvas, opts?: { afterFrameId?: string }): { canvas: Canvas; frameId: string } {
  const id = nanoid();
  const maxRight = canvas.frames.reduce((m, f) => Math.max(m, f.canvasX + f.width), 0);
  const canvasX = canvas.frames.length ? maxRight + FRAME_GAP : 0;
  const frame: Frame = {
    id,
    name: `Frame ${canvas.frames.length + 1}`,
    canvasX,
    canvasY: 0,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    elements: [],
    background: { type: 'solid', color: '#ffffff' },
    transition: 'fade',
  };
  return {
    canvas: {
      ...canvas,
      frames: [...canvas.frames, frame],
      sequences: insertIntoDefaultSequence(canvas, id, opts?.afterFrameId),
    },
    frameId: id,
  };
}

/** Deep-clone a frame (fresh ids), offset its position, insert after the source in the default sequence. */
export function duplicateFrame(canvas: Canvas, frameId: string): { canvas: Canvas; frameId: string } {
  const source = canvas.frames.find((f) => f.id === frameId);
  if (!source) return { canvas, frameId };
  const id = nanoid();
  const clone: Frame = JSON.parse(JSON.stringify(source));
  clone.id = id;
  clone.name = `${source.name} copy`;
  clone.canvasX = source.canvasX + FRAME_GAP / 2;
  clone.canvasY = source.canvasY + FRAME_GAP / 2;
  clone.elements = clone.elements.map((el) => ({ ...el, id: nanoid() }));
  return {
    canvas: {
      ...canvas,
      frames: [...canvas.frames, clone],
      sequences: insertIntoDefaultSequence(canvas, id, frameId),
    },
    frameId: id,
  };
}

/** Remove a frame (and all its sequence references). Never removes the last frame. */
export function deleteFrame(canvas: Canvas, frameId: string): Canvas {
  if (canvas.frames.length <= 1) return canvas;
  return {
    ...canvas,
    frames: canvas.frames.filter((f) => f.id !== frameId),
    sequences: canvas.sequences.map((seq) => ({
      ...seq,
      frameIds: seq.frameIds.filter((fid) => fid !== frameId),
    })),
  };
}

/** Set a frame's absolute canvas position. */
export function moveFrame(canvas: Canvas, frameId: string, canvasX: number, canvasY: number): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, canvasX, canvasY }));
}

export function renameFrame(canvas: Canvas, frameId: string, name: string): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, name }));
}

export function updateFrameBackground(canvas: Canvas, frameId: string, background: SlideBackground): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, background }));
}

export function updateFrameNotes(canvas: Canvas, frameId: string, notes: string): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, notes }));
}

export function updateFrameTransition(canvas: Canvas, frameId: string, transition: Frame['transition']): Canvas {
  return mapFrame(canvas, frameId, (f) => ({ ...f, transition }));
}

/** Reorder a sequence's frameIds (default sequence in this plan). Positions are untouched. */
export function reorderSequence(canvas: Canvas, sequenceId: string, fromIndex: number, toIndex: number): Canvas {
  return {
    ...canvas,
    sequences: canvas.sequences.map((seq) => {
      if (seq.id !== sequenceId) return seq;
      const ids = [...seq.frameIds];
      if (fromIndex < 0 || fromIndex >= ids.length) return seq;
      const [moved] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, moved);
      return { ...seq, frameIds: ids };
    }),
  };
}
