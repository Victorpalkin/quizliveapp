import { describe, it, expect } from 'vitest';
import { projectMinimap, minimapPointToCamera } from './canvas-minimap';
import type { Camera, Viewport, FrameBox } from './canvas-camera';

const FRAMES: FrameBox[] = [
  { id: 'a', canvasX: 0, canvasY: 0, width: 100, height: 100 },
  { id: 'b', canvasX: 200, canvasY: 0, width: 100, height: 100 },
];
// union box: 300 x 100
const MINIMAP = { width: 300, height: 100 }; // -> scale 1

describe('projectMinimap', () => {
  it('projects frames into minimap space at the fit scale', () => {
    const cam: Camera = { x: 50, y: 50, zoom: 1 };
    const vp: Viewport = { width: 100, height: 100 };
    const { frameRects } = projectMinimap(FRAMES, cam, vp, MINIMAP);
    expect(frameRects).toEqual([
      { id: 'a', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', x: 200, y: 0, width: 100, height: 100 },
    ]);
  });

  it('projects the current viewport rect', () => {
    const cam: Camera = { x: 50, y: 50, zoom: 1 };
    const vp: Viewport = { width: 100, height: 100 };
    const { viewportRect } = projectMinimap(FRAMES, cam, vp, MINIMAP);
    // visible world = 100x100 centered at (50,50) -> top-left (0,0)
    expect(viewportRect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('returns empty rects for no frames', () => {
    const { frameRects } = projectMinimap([], { x: 0, y: 0, zoom: 1 }, { width: 100, height: 100 }, MINIMAP);
    expect(frameRects).toEqual([]);
  });
});

describe('minimapPointToCamera', () => {
  it('inverts the projection, preserving zoom', () => {
    const cam: Camera = { x: 0, y: 0, zoom: 3 };
    const vp: Viewport = { width: 100, height: 100 };
    // click at frame b center in minimap space (250, 50)
    const result = minimapPointToCamera({ x: 250, y: 50 }, FRAMES, vp, MINIMAP, cam);
    expect(result.x).toBeCloseTo(250, 6);
    expect(result.y).toBeCloseTo(50, 6);
    expect(result.zoom).toBe(3);
  });
});
