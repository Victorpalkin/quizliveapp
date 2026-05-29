import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  screenToWorld,
  cameraToTransform,
  clampZoom,
  panBy,
  framesBoundingBox,
  fitFrame,
  fitAllFrames,
  zoomAtPoint,
  type Camera,
  type Viewport,
  type FrameBox,
} from './canvas-camera';

const VP: Viewport = { width: 800, height: 600 };

describe('worldToScreen / screenToWorld', () => {
  it('maps the camera center world point to the viewport center', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    expect(worldToScreen({ x: 100, y: 50 }, cam, VP)).toEqual({ x: 400, y: 300 });
  });

  it('round-trips an arbitrary point', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    const world = { x: 137, y: -22 };
    const screen = worldToScreen(world, cam, VP);
    const back = screenToWorld(screen, cam, VP);
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
  });
});

describe('cameraToTransform', () => {
  it('builds the world-container CSS transform', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 2 };
    expect(cameraToTransform(cam, VP)).toBe(
      'translate(400px, 300px) scale(2) translate(-100px, -50px)'
    );
  });
});

describe('clampZoom', () => {
  it('clamps to the default 0.1..4 range', () => {
    expect(clampZoom(0.05)).toBe(0.1);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});

describe('panBy', () => {
  it('shifts the camera in world units scaled by zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 2 };
    expect(panBy(cam, 10, 20)).toEqual({ x: -5, y: -10, zoom: 2 });
  });
});

describe('framesBoundingBox', () => {
  it('returns null for no frames', () => {
    expect(framesBoundingBox([])).toBeNull();
  });

  it('computes the union box', () => {
    const frames: FrameBox[] = [
      { canvasX: 0, canvasY: 0, width: 100, height: 100 },
      { canvasX: 200, canvasY: 50, width: 100, height: 100 },
    ];
    expect(framesBoundingBox(frames)).toEqual({
      minX: 0, minY: 0, maxX: 300, maxY: 150, width: 300, height: 150,
    });
  });
});

describe('fitFrame', () => {
  it('centers on the frame and zooms to fit with default 10% padding', () => {
    const frame: FrameBox = { canvasX: 0, canvasY: 0, width: 1280, height: 720 };
    const cam = fitFrame(frame, { width: 1280, height: 720 });
    expect(cam.x).toBe(640);
    expect(cam.y).toBe(360);
    expect(cam.zoom).toBeCloseTo(0.9, 6); // min(1280*0.9/1280, 720*0.9/720)
  });
});

describe('fitAllFrames', () => {
  it('falls back to identity when there are no frames', () => {
    expect(fitAllFrames([], { width: 800, height: 600 })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('centers on the union box and zooms to fit', () => {
    const frames: FrameBox[] = [
      { canvasX: 0, canvasY: 0, width: 1000, height: 500 },
      { canvasX: 2000, canvasY: 0, width: 1000, height: 500 },
    ];
    // union box: 3000 x 500, center (1500, 250)
    const cam = fitAllFrames(frames, { width: 3000, height: 500 });
    expect(cam.x).toBe(1500);
    expect(cam.y).toBe(250);
    expect(cam.zoom).toBeCloseTo(0.9, 6); // min(3000*0.9/3000, 500*0.9/500)
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the cursor fixed on screen', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 1 };
    const cursor = { x: 500, y: 300 };
    const worldBefore = screenToWorld(cursor, cam, VP);
    const next = zoomAtPoint(cam, cursor, 2, VP);
    expect(next.zoom).toBe(2);
    const screenAfter = worldToScreen(worldBefore, next, VP);
    expect(screenAfter.x).toBeCloseTo(cursor.x, 6);
    expect(screenAfter.y).toBeCloseTo(cursor.y, 6);
  });

  it('clamps the requested zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 1 };
    expect(zoomAtPoint(cam, { x: 400, y: 300 }, 99, VP).zoom).toBe(4);
  });
});
