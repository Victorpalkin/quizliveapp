import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  screenToWorld,
  cameraToTransform,
  clampZoom,
  panBy,
  framesBoundingBox,
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
