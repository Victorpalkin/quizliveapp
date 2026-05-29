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
}

export function InfiniteCanvas({
  canvas,
  sequenceId,
  showMiniMap = true,
  className,
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
        {canvas.frames.map((frame) => (
          <div
            key={frame.id}
            className="absolute cursor-pointer shadow-sm"
            style={{
              left: frame.canvasX,
              top: frame.canvasY,
              width: frame.width,
              height: frame.height,
            }}
            onClick={() => nav.goToFrame(frame.id)}
          >
            <FrameContent frame={frame} />
            <FrameOverlay name={frame.name} active={frame.id === nav.currentFrameId} />
          </div>
        ))}
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
