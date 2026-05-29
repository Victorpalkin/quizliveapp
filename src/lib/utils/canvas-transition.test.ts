import { describe, it, expect } from 'vitest';
import {
  deriveTransition,
  interpolateCamera,
  easeInOutCubic,
  nextFrameId,
  prevFrameId,
} from './canvas-transition';
import type { Camera } from './canvas-camera';
import type { Sequence } from '../types/canvas';

describe('deriveTransition', () => {
  it('maps each legacy transition value', () => {
    expect(deriveTransition('zoom')).toEqual({ type: 'zoom-pan', durationMs: 800 });
    expect(deriveTransition('fade')).toEqual({ type: 'fade', durationMs: 400 });
    expect(deriveTransition('none')).toEqual({ type: 'instant', durationMs: 0 });
    expect(deriveTransition('slide')).toEqual({ type: 'zoom-pan', durationMs: 800 });
    expect(deriveTransition(undefined)).toEqual({ type: 'zoom-pan', durationMs: 800 });
  });
});

describe('easeInOutCubic', () => {
  it('pins the endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});

describe('interpolateCamera', () => {
  const from: Camera = { x: 0, y: 0, zoom: 1 };
  const to: Camera = { x: 100, y: 100, zoom: 4 };

  it('returns the endpoints at t=0 and t=1', () => {
    expect(interpolateCamera(from, to, 0)).toEqual({ x: 0, y: 0, zoom: 1 });
    const end = interpolateCamera(from, to, 1);
    expect(end.x).toBeCloseTo(100, 6);
    expect(end.y).toBeCloseTo(100, 6);
    expect(end.zoom).toBeCloseTo(4, 6);
  });

  it('interpolates zoom in log space (geometric midpoint with linear easing)', () => {
    const mid = interpolateCamera(from, to, 0.5, (t) => t); // linear easing
    expect(mid.zoom).toBeCloseTo(2, 6); // 1 * (4/1)^0.5
  });

  it('clamps t outside [0,1]', () => {
    expect(interpolateCamera(from, to, -1)).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('nextFrameId / prevFrameId', () => {
  const seq: Sequence = { id: 'main', name: 'Main', frameIds: ['a', 'b', 'c'] };

  it('steps forward and clamps at the end', () => {
    expect(nextFrameId(seq, 'a')).toBe('b');
    expect(nextFrameId(seq, 'c')).toBeNull();
  });

  it('steps backward and clamps at the start', () => {
    expect(prevFrameId(seq, 'b')).toBe('a');
    expect(prevFrameId(seq, 'a')).toBeNull();
  });

  it('returns null for an unknown frame id', () => {
    expect(nextFrameId(seq, 'x')).toBeNull();
    expect(prevFrameId(seq, 'x')).toBeNull();
  });
});
