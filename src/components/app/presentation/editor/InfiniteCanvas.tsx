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
          const handlePointerDown = onFrameMove
            ? (e: React.PointerEvent) => {
                if (e.button !== 0) return;
                e.stopPropagation(); // don't start a canvas pan
                const startClientX = e.clientX;
                const startClientY = e.clientY;
                const startX = frame.canvasX;
                const startY = frame.canvasY;
                const zoom = nav.camera.zoom;
                let moved = false;
                const onMove = (ev: PointerEvent) => {
                  const dx = (ev.clientX - startClientX) / zoom;
                  const dy = (ev.clientY - startClientY) / zoom;
                  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
                  if (moved) onFrameMove(frame.id, startX + dx, startY + dy);
                };
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }
            : undefined;
          return (
            <div
              key={frame.id}
              className={`absolute shadow-sm ${onFrameMove ? 'cursor-move' : 'cursor-pointer'} ${
                selectedFrameId === frame.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                left: frame.canvasX,
                top: frame.canvasY,
                width: frame.width,
                height: frame.height,
              }}
              onPointerDown={handlePointerDown}
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
