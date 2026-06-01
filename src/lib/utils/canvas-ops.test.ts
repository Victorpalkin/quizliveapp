import { describe, it, expect } from 'vitest';
import {
  createDefaultCanvas,
  addFrame,
  duplicateFrame,
  deleteFrame,
  moveFrame,
  renameFrame,
  reorderSequence,
} from './canvas-ops';
import { FRAME_WIDTH, FRAME_GAP, DEFAULT_SEQUENCE_ID } from '../types/canvas';

describe('createDefaultCanvas', () => {
  it('has one frame referenced by the default sequence', () => {
    const c = createDefaultCanvas();
    expect(c.frames).toHaveLength(1);
    expect(c.defaultSequenceId).toBe(DEFAULT_SEQUENCE_ID);
    expect(c.sequences[0].frameIds).toEqual([c.frames[0].id]);
  });
});

describe('addFrame', () => {
  it('appends a frame to the right and into the default sequence', () => {
    const c0 = createDefaultCanvas();
    const x0 = c0.frames[0];
    const { canvas, frameId } = addFrame(c0);
    expect(canvas.frames).toHaveLength(2);
    const added = canvas.frames.find((f) => f.id === frameId)!;
    expect(added.canvasX).toBe(x0.canvasX + x0.width + FRAME_GAP);
    expect(canvas.sequences[0].frameIds).toEqual([x0.id, frameId]);
  });
});

describe('duplicateFrame', () => {
  it('clones the frame with fresh ids and inserts after the source in the sequence', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas; // 2 frames: A, B
    const sourceId = c.frames[0].id;
    const { canvas, frameId } = duplicateFrame(c, sourceId);
    expect(canvas.frames).toHaveLength(3);
    expect(frameId).not.toBe(sourceId);
    // inserted right after source in the sequence
    expect(canvas.sequences[0].frameIds[1]).toBe(frameId);
  });
});

describe('deleteFrame', () => {
  it('removes the frame and its sequence references', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas;
    const removeId = c.frames[1].id;
    const canvas = deleteFrame(c, removeId);
    expect(canvas.frames.some((f) => f.id === removeId)).toBe(false);
    expect(canvas.sequences[0].frameIds).not.toContain(removeId);
  });

  it('never deletes the last remaining frame', () => {
    const c = createDefaultCanvas();
    const canvas = deleteFrame(c, c.frames[0].id);
    expect(canvas.frames).toHaveLength(1);
  });
});

describe('moveFrame', () => {
  it('sets absolute canvas position', () => {
    const c = createDefaultCanvas();
    const canvas = moveFrame(c, c.frames[0].id, 500, 300);
    expect(canvas.frames[0].canvasX).toBe(500);
    expect(canvas.frames[0].canvasY).toBe(300);
  });
});

describe('renameFrame', () => {
  it('renames a frame', () => {
    const c = createDefaultCanvas();
    const canvas = renameFrame(c, c.frames[0].id, 'Intro');
    expect(canvas.frames[0].name).toBe('Intro');
  });
});

describe('reorderSequence', () => {
  it('reorders frameIds without touching positions', () => {
    let c = createDefaultCanvas();
    c = addFrame(c).canvas; // A, B
    const [a, b] = c.sequences[0].frameIds;
    const posA = c.frames.find((f) => f.id === a)!.canvasX;
    const canvas = reorderSequence(c, DEFAULT_SEQUENCE_ID, 0, 1);
    expect(canvas.sequences[0].frameIds).toEqual([b, a]);
    expect(canvas.frames.find((f) => f.id === a)!.canvasX).toBe(posA); // unchanged
  });
});
