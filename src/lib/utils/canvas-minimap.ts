import { framesBoundingBox, type Camera, type FrameBox, type Point, type Viewport } from './canvas-camera';

export interface MinimapRect {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinimapProjection {
  frameRects: MinimapRect[];
  viewportRect: MinimapRect;
}

interface Size {
  width: number;
  height: number;
}

/** Scale that fits the frames' world bbox inside the minimap box. */
function minimapScale(frames: FrameBox[], minimapSize: Size): { scale: number; minX: number; minY: number } {
  const bbox = framesBoundingBox(frames);
  if (!bbox || bbox.width === 0 || bbox.height === 0) {
    return { scale: 1, minX: bbox?.minX ?? 0, minY: bbox?.minY ?? 0 };
  }
  return {
    scale: Math.min(minimapSize.width / bbox.width, minimapSize.height / bbox.height),
    minX: bbox.minX,
    minY: bbox.minY,
  };
}

export function projectMinimap(
  frames: FrameBox[],
  camera: Camera,
  viewport: Viewport,
  minimapSize: Size
): MinimapProjection {
  const { scale, minX, minY } = minimapScale(frames, minimapSize);

  const frameRects: MinimapRect[] = frames.map((f) => ({
    id: f.id,
    x: (f.canvasX - minX) * scale,
    y: (f.canvasY - minY) * scale,
    width: f.width * scale,
    height: f.height * scale,
  }));

  const visW = viewport.width / camera.zoom;
  const visH = viewport.height / camera.zoom;
  const viewportRect: MinimapRect = {
    x: (camera.x - visW / 2 - minX) * scale,
    y: (camera.y - visH / 2 - minY) * scale,
    width: visW * scale,
    height: visH * scale,
  };

  return { frameRects, viewportRect };
}

/** A click in minimap space -> a camera centered on that world point (zoom kept). */
export function minimapPointToCamera(
  point: Point,
  frames: FrameBox[],
  _viewport: Viewport,
  minimapSize: Size,
  currentCamera: Camera
): Camera {
  const { scale, minX, minY } = minimapScale(frames, minimapSize);
  return {
    x: point.x / scale + minX,
    y: point.y / scale + minY,
    zoom: currentCamera.zoom,
  };
}
