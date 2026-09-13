'use client';

import { useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { projectMinimap, minimapPointToCamera } from '@/lib/utils/canvas-minimap';
import type { Camera, FrameBox, Viewport } from '@/lib/utils/canvas-camera';

const MINIMAP_SIZE = { width: 192, height: 128 };

interface MiniMapProps {
  frames: FrameBox[];
  camera: Camera;
  viewport: Viewport;
  onJump: (camera: Camera) => void;
}

export function MiniMap({ frames, camera, viewport, onJump }: MiniMapProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 right-4 rounded-md bg-background/90 p-2 shadow hover:bg-background"
        title="Show mini-map"
      >
        <MapIcon className="h-4 w-4" />
      </button>
    );
  }

  const { frameRects, viewportRect } = projectMinimap(frames, camera, viewport, MINIMAP_SIZE);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onJump(minimapPointToCamera(point, frames, viewport, MINIMAP_SIZE, camera));
  };

  return (
    <div className="absolute bottom-4 right-4 rounded-md bg-background/90 p-1.5 shadow">
      <div className="mb-1 flex items-center justify-between">
        <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Map</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-0.5 hover:bg-muted"
          title="Hide mini-map"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div
        className="relative cursor-pointer overflow-hidden rounded bg-muted/40"
        style={{ width: MINIMAP_SIZE.width, height: MINIMAP_SIZE.height }}
        onClick={handleClick}
      >
        {frameRects.map((r) => (
          <div
            key={r.id}
            className="absolute rounded-[1px] border border-muted-foreground/40 bg-muted-foreground/20"
            style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
          />
        ))}
        <div
          className="pointer-events-none absolute border-2 border-primary/80"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
          }}
        />
      </div>
    </div>
  );
}
