'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import type { Canvas, Sequence } from '@/lib/types/canvas';
import {
  clampZoom,
  fitAllFrames,
  fitFrame,
  panBy,
  zoomAtPoint,
  type Camera,
  type Point,
  type Viewport,
} from '@/lib/utils/canvas-camera';
import {
  deriveTransition,
  interpolateCamera,
  nextFrameId,
  prevFrameId,
  type FrameTransition,
} from '@/lib/utils/canvas-transition';

export function useCanvasNavigation(canvas: Canvas, sequenceId?: string) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastTransition, setLastTransition] = useState<FrameTransition | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);

  const sequence: Sequence | undefined =
    canvas.sequences.find((s) => s.id === (sequenceId ?? canvas.defaultSequenceId)) ??
    canvas.sequences[0];

  const cancelAnim = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  useEffect(() => () => cancelAnim(), [cancelAnim]);

  const animateTo = useCallback(
    (target: Camera, durationMs: number) => {
      cancelAnim();
      if (durationMs <= 0 || viewport.width === 0) {
        setCamera(target);
        return;
      }
      setIsAnimating(true);
      const startTime = performance.now();
      const from = camera;
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        setCamera(interpolateCamera(from, target, t));
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = null;
          setIsAnimating(false);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [camera, viewport.width, cancelAnim]
  );

  const pointInContainer = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const jumpTo = useCallback(
    (target: Camera) => {
      cancelAnim();
      setCamera(target);
    },
    [cancelAnim]
  );

  const fitAll = useCallback(() => {
    if (viewport.width === 0) return;
    cancelAnim();
    setCamera(fitAllFrames(canvas.frames, viewport));
    setCurrentFrameId(null);
  }, [canvas.frames, viewport, cancelAnim]);

  const goToFrame = useCallback(
    (frameId: string) => {
      const frame = canvas.frames.find((f) => f.id === frameId);
      if (!frame || viewport.width === 0) return;
      const target = fitFrame(frame, viewport);
      const transition = deriveTransition(frame.transition);
      setLastTransition(transition);
      setCurrentFrameId(frameId);
      if (transition.type === 'instant') {
        cancelAnim();
        setCamera(target);
      } else {
        animateTo(target, transition.durationMs);
      }
    },
    [canvas.frames, viewport, animateTo, cancelAnim]
  );

  const next = useCallback(() => {
    if (!sequence) return;
    if (currentFrameId == null) {
      if (sequence.frameIds[0]) goToFrame(sequence.frameIds[0]);
      return;
    }
    const id = nextFrameId(sequence, currentFrameId);
    if (id) goToFrame(id);
  }, [sequence, currentFrameId, goToFrame]);

  const prev = useCallback(() => {
    if (!sequence) return;
    if (currentFrameId == null) {
      if (sequence.frameIds[0]) goToFrame(sequence.frameIds[0]);
      return;
    }
    const id = prevFrameId(sequence, currentFrameId);
    if (id) goToFrame(id);
  }, [sequence, currentFrameId, goToFrame]);

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching }) => {
        if (pinching) return;
        cancelAnim();
        setCamera((c) => panBy(c, dx, dy));
      },
      onWheel: ({ delta: [dx, dy], event }) => {
        const we = event as WheelEvent;
        cancelAnim();
        if (we.ctrlKey || we.metaKey) {
          const p = pointInContainer(we.clientX, we.clientY);
          setCamera((c) => zoomAtPoint(c, p, c.zoom * Math.exp(-dy * 0.0015), viewport));
        } else {
          setCamera((c) => panBy(c, -dx, -dy));
        }
      },
      onPinch: ({ origin: [ox, oy], movement: [ms], first, memo }) => {
        cancelAnim();
        const base = first ? camera.zoom : (memo as number);
        const p = pointInContainer(ox, oy);
        setCamera((c) => zoomAtPoint(c, p, clampZoom(base * ms), viewport));
        return base;
      },
    },
    { wheel: { eventOptions: { passive: false } }, drag: { filterTaps: true } }
  );

  return {
    containerRef,
    bind,
    camera,
    viewport,
    setViewport,
    sequence,
    currentFrameId,
    isAnimating,
    lastTransition,
    goToFrame,
    next,
    prev,
    fitAll,
    jumpTo,
  };
}
