/**
 * Pure camera math for the infinite canvas. No DOM, no React — fully unit-testable.
 *
 * Camera.(x, y) is the WORLD coordinate displayed at the viewport center.
 * Camera.zoom is the scale factor (screen px per world px).
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Geometry-only view of a Frame (a full Frame is structurally assignable). */
export interface FrameBox {
  id?: string;
  canvasX: number;
  canvasY: number;
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.min(max, Math.max(min, zoom));
}

export function worldToScreen(point: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (point.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

export function screenToWorld(point: Point, camera: Camera, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (point.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/**
 * CSS transform for the world container (set transform-origin: 0 0).
 * Maps a child positioned at world (wx, wy) to its on-screen location.
 */
export function cameraToTransform(camera: Camera, viewport: Viewport): string {
  return (
    `translate(${viewport.width / 2}px, ${viewport.height / 2}px) ` +
    `scale(${camera.zoom}) ` +
    `translate(${-camera.x}px, ${-camera.y}px)`
  );
}

/** Pan by a screen-space delta; content follows the drag. */
export function panBy(camera: Camera, dxScreen: number, dyScreen: number): Camera {
  return {
    ...camera,
    x: camera.x - dxScreen / camera.zoom,
    y: camera.y - dyScreen / camera.zoom,
  };
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function framesBoundingBox(frames: FrameBox[]): BoundingBox | null {
  if (frames.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of frames) {
    minX = Math.min(minX, f.canvasX);
    minY = Math.min(minY, f.canvasY);
    maxX = Math.max(maxX, f.canvasX + f.width);
    maxY = Math.max(maxY, f.canvasY + f.height);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
