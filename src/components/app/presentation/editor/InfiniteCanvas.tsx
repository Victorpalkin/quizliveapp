'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import type { Canvas } from '@/lib/types/canvas';
import { Button } from '@/components/ui/button';
import { cameraToTransform } from '@/lib/utils/canvas-camera';
import { useCanvasNavigation } from '@/hooks/presentation/use-canvas-navigation';
import { FrameContent } from './FrameContent';
import { FrameOverlay } from './FrameOverlay';
import { MiniMap } from './MiniMap';

interface InfiniteCanvasProps {
  canvas: Canvas;
  sequenceId?: string;
  showMiniMap?: boolean;
  className?: string;
  /** Editor mode: id of the currently selected frame (highlighted). */
  selectedFrameId?: string | null;
  /** Editor mode: single-click selects a frame (stays in overview). When omitted, click focuses the camera (read-only nav). */
  onFrameSelect?: (frameId: string) => void;
  /** Editor mode: double-click a frame to activate (enter edit). */
  onFrameActivate?: (frameId: string) => void;
  /** Editor mode: drag a frame to reposition it (absolute canvas px). Enables drag when provided. */
  onFrameMove?: (frameId: string, canvasX: number, canvasY: number) => void;
}

export function InfiniteCanvas({
  canvas,
  sequenceId,
  showMiniMap = true,
  className,
  selectedFrameId,
  onFrameSelect,
  onFrameActivate,
  onFrameMove,
}: InfiniteCanvasProps) {
  const nav = useCanvasNavigation(canvas, sequenceId);
  const { setViewport, fitAll } = nav;
  const didFit = useRef(false);
  const dragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    zoom: number;
    moved: boolean;
  } | null>(null);

  // Measure the viewport and keep it in sync with size changes.
  useEffect(() => {
    const el = nav.containerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [nav.containerRef, setViewport]);

  // Fit all frames once, as soon as the viewport size is known.
  useEffect(() => {
    if (!didFit.current && nav.viewport.width > 0) {
      didFit.current = true;
      fitAll();
    }
  }, [nav.viewport.width, fitAll]);

  const seqLen = nav.sequence?.frameIds.length ?? 0;
  const seqIndex =
    nav.currentFrameId && nav.sequence ? nav.sequence.frameIds.indexOf(nav.currentFrameId) : -1;

  return (
    <div
      ref={nav.containerRef}
      {...nav.bind()}
      className={`relative touch-none overflow-hidden bg-muted/20 ${className ?? ''}`}
    >
      {/* World container — one CSS transform IS the camera. */}
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: cameraToTransform(nav.camera, nav.viewport), transformOrigin: '0 0' }}
      >
        {canvas.frames.map((frame) => {
          const editable = !!onFrameMove;
          return (
            <div
              key={frame.id}
              data-frame="true"
              className={`absolute shadow-sm ${editable ? 'cursor-move' : 'cursor-pointer'} ${
                selectedFrameId === frame.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                left: frame.canvasX,
                top: frame.canvasY,
                width: frame.width,
                height: frame.height,
              }}
              onPointerDown={
                editable
                  ? (e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation(); // best-effort: keep the canvas pan from also starting
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragRef.current = {
                        id: frame.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startX: frame.canvasX,
                        startY: frame.canvasY,
                        zoom: nav.camera.zoom,
                        moved: false,
                      };
                    }
                  : undefined
              }
              onPointerMove={
                editable
                  ? (e) => {
                      const d = dragRef.current;
                      if (!d || d.id !== frame.id) return;
                      const dx = (e.clientX - d.startClientX) / d.zoom;
                      const dy = (e.clientY - d.startClientY) / d.zoom;
                      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
                      if (d.moved) onFrameMove!(frame.id, d.startX + dx, d.startY + dy);
                    }
                  : undefined
              }
              onPointerUp={
                editable
                  ? (e) => {
                      if (dragRef.current?.id === frame.id) dragRef.current = null;
                      e.currentTarget.releasePointerCapture?.(e.pointerId);
                    }
                  : undefined
              }
              onClick={() => (onFrameSelect ? onFrameSelect(frame.id) : nav.goToFrame(frame.id))}
              onDoubleClick={() => onFrameActivate?.(frame.id)}
            >
              <FrameContent frame={frame} />
              <FrameOverlay name={frame.name} active={frame.id === (selectedFrameId ?? nav.currentFrameId)} />
            </div>
          );
        })}
      </div>

      {/* Fade transition: brief dim overlay (all frames are always visible, so no true cross-fade). */}
      {nav.lastTransition?.type === 'fade' && nav.isAnimating && (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-background/40" />
      )}

      {showMiniMap && nav.viewport.width > 0 && (
        <MiniMap
          frames={canvas.frames}
          camera={nav.camera}
          viewport={nav.viewport}
          onJump={nav.jumpTo}
        />
      )}

      {/* Minimal sequence nav controls. */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/90 px-2 py-1 shadow">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.prev} title="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {seqIndex >= 0 ? seqIndex + 1 : '–'}/{seqLen}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.next} title="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nav.fitAll} title="Fit all">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
