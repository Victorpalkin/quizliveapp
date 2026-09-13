import type { Camera } from './canvas-camera';
import type { Sequence } from '../types/canvas';
import type { PresentationSlide } from '../types/presentation';

/**
 * Render-time transition. Defined here (not on the persisted Frame) so the
 * foundation's slide<->canvas round-trip stays lossless.
 */
export interface FrameTransition {
  type: 'zoom-pan' | 'fade' | 'instant';
  durationMs: number;
}

/** Map the legacy slide transition union to a render-time FrameTransition. */
export function deriveTransition(legacy: PresentationSlide['transition']): FrameTransition {
  switch (legacy) {
    case 'zoom':
      return { type: 'zoom-pan', durationMs: 800 };
    case 'fade':
      return { type: 'fade', durationMs: 400 };
    case 'none':
      return { type: 'instant', durationMs: 0 };
    case 'slide':
    default:
      return { type: 'zoom-pan', durationMs: 800 };
  }
}

export type Easing = (t: number) => number;

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Interpolate a camera; x/y linear, zoom in log space for even perceptual zoom. */
export function interpolateCamera(
  from: Camera,
  to: Camera,
  t: number,
  easing: Easing = easeInOutCubic
): Camera {
  const e = easing(Math.max(0, Math.min(1, t)));
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, e),
  };
}

export function nextFrameId(sequence: Sequence, currentId: string): string | null {
  const i = sequence.frameIds.indexOf(currentId);
  if (i === -1 || i >= sequence.frameIds.length - 1) return null;
  return sequence.frameIds[i + 1];
}

export function prevFrameId(sequence: Sequence, currentId: string): string | null {
  const i = sequence.frameIds.indexOf(currentId);
  if (i <= 0) return null;
  return sequence.frameIds[i - 1];
}
