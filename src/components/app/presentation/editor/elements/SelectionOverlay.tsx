'use client';

import { useCallback, useRef } from 'react';
import type { SlideElement } from '@/lib/types';

interface SelectionOverlayProps {
  element: SlideElement;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onResize: (width: number, height: number, x?: number, y?: number) => void;
}

type HandlePosition = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

export function SelectionOverlay({ element, canvasRef, onResize }: SelectionOverlayProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, position: HandlePosition) => {
      e.stopPropagation();
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = element.width;
      const startHeight = element.height;
      const startElX = element.x;
      const startElY = element.y;

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ((ev.clientX - startX) / rect.width) * 100;
        const dy = ((ev.clientY - startY) / rect.height) * 100;

        let newW = startWidth;
        let newH = startHeight;
        let newX: number | undefined;
        let newY: number | undefined;

        switch (position) {
          case 'se':
            newW = startWidth + dx;
            newH = startHeight + dy;
            break;
          case 'sw':
            newW = startWidth - dx;
            newH = startHeight + dy;
            newX = startElX + dx;
            break;
          case 'ne':
            newW = startWidth + dx;
            newH = startHeight - dy;
            newY = startElY + dy;
            break;
          case 'nw':
            newW = startWidth - dx;
            newH = startHeight - dy;
            newX = startElX + dx;
            newY = startElY + dy;
            break;
          case 'e':
            newW = startWidth + dx;
            break;
          case 'w':
            newW = startWidth - dx;
            newX = startElX + dx;
            break;
          case 's':
            newH = startHeight + dy;
            break;
          case 'n':
            newH = startHeight - dy;
            newY = startElY + dy;
            break;
        }

        onResize(newW, newH, newX, newY);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [element, canvasRef, onResize]
  );

  const handles: HandlePosition[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

  const handleStyles: Record<HandlePosition, React.CSSProperties> = {
    nw: { top: -4, left: -4 },
    ne: { top: -4, right: -4 },
    sw: { bottom: -4, left: -4 },
    se: { bottom: -4, right: -4 },
    n: { top: -4, left: '50%', transform: 'translateX(-50%)' },
    s: { bottom: -4, left: '50%', transform: 'translateX(-50%)' },
    e: { right: -4, top: '50%', transform: 'translateY(-50%)' },
    w: { left: -4, top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <>
      {/* Selection border */}
      <div className="absolute inset-0 border-2 border-primary pointer-events-none rounded-sm" />

      {/* Resize handles */}
      {handles.map((pos) => (
        <div
          key={pos}
          className="absolute w-2.5 h-2.5 bg-white border-2 border-primary rounded-sm z-10"
          style={{
            ...handleStyles[pos],
            cursor: HANDLE_CURSORS[pos],
          }}
          onMouseDown={(e) => handleMouseDown(e, pos)}
        />
      ))}
    </>
  );
}
