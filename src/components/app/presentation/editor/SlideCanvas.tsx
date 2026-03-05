'use client';

import { useRef, useState, useCallback } from 'react';
import type { PresentationSlide, SlideElement, PresentationTheme } from '@/lib/types';
import { TextElement } from './elements/TextElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { InteractiveElement } from './elements/InteractiveElement';
import { ResultsElement } from './elements/ResultsElement';
import { SelectionOverlay } from './elements/SelectionOverlay';

interface SlideCanvasProps {
  slide: PresentationSlide | null;
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  onDeleteElement: (elementId: string) => void;
  theme: PresentationTheme;
}

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation'];
const RESULTS_TYPES = ['quiz-results', 'poll-results', 'thoughts-results', 'rating-results', 'evaluation-results'];
const SPECIAL_TYPES = ['leaderboard', 'qa', 'spin-wheel'];

function ElementRenderer({
  element,
  isSelected,
  onSelect,
}: {
  element: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
}) {
  if (element.type === 'text') {
    return <TextElement element={element} isSelected={isSelected} />;
  }
  if (element.type === 'image') {
    return <ImageElement element={element} />;
  }
  if (element.type === 'shape') {
    return <ShapeElement element={element} />;
  }
  if (INTERACTIVE_TYPES.includes(element.type) || SPECIAL_TYPES.includes(element.type)) {
    return <InteractiveElement element={element} />;
  }
  if (RESULTS_TYPES.includes(element.type)) {
    return <ResultsElement element={element} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      {element.type}
    </div>
  );
}

export function SlideCanvas({
  slide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  theme,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);

  if (!slide) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No slide selected
      </div>
    );
  }

  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid' && slide.background.color) {
      bgStyle.backgroundColor = slide.background.color;
    } else if (slide.background.type === 'gradient' && slide.background.gradient) {
      bgStyle.background = slide.background.gradient;
    } else if (slide.background.type === 'image' && slide.background.imageUrl) {
      bgStyle.backgroundImage = `url(${slide.background.imageUrl})`;
      bgStyle.backgroundSize = 'cover';
      bgStyle.backgroundPosition = 'center';
    }
  } else {
    bgStyle.backgroundColor = '#ffffff';
  }

  // Sort elements by zIndex for rendering order
  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
      onSelectElement(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    if (element.locked) return;
    e.stopPropagation();
    onSelectElement(element.id);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elX: element.x,
      elY: element.y,
    };
    setIsDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ((ev.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((ev.clientY - dragStartRef.current.y) / rect.height) * 100;
      onUpdateElement(element.id, {
        x: Math.max(0, Math.min(100 - element.width, dragStartRef.current.elX + dx)),
        y: Math.max(0, Math.min(100 - element.height, dragStartRef.current.elY + dy)),
      });
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResize = useCallback(
    (elementId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => {
      const updates: Partial<SlideElement> = {
        width: Math.max(5, newWidth),
        height: Math.max(5, newHeight),
      };
      if (newX !== undefined) updates.x = Math.max(0, newX);
      if (newY !== undefined) updates.y = Math.max(0, newY);
      onUpdateElement(elementId, updates);
    },
    [onUpdateElement]
  );

  const hasBackground = slide.background && (
    (slide.background.type === 'solid' && slide.background.color) ||
    (slide.background.type === 'gradient' && slide.background.gradient) ||
    (slide.background.type === 'image' && slide.background.imageUrl)
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-muted/20">
      <div
        ref={canvasRef}
        className={`relative shadow-xl rounded-lg overflow-hidden ${!hasBackground ? 'bg-grid-dots' : ''}`}
        style={{
          ...bgStyle,
          aspectRatio: '16 / 9',
          width: '100%',
          maxWidth: '960px',
          maxHeight: 'calc(100vh - 140px)',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        {sortedElements.map((element) => {
          const isSelected = element.id === selectedElementId;
          return (
            <div
              key={element.id}
              className={`absolute group/el transition-shadow duration-150 ${
                isDragging && isSelected ? 'shadow-2xl' : ''
              }`}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
                zIndex: element.zIndex,
                opacity: element.opacity ?? 1,
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                cursor: element.locked ? 'default' : isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={(e) => handleMouseDown(e, element)}
            >
              <ElementRenderer
                element={element}
                isSelected={isSelected}
                onSelect={() => onSelectElement(element.id)}
              />
              {/* Hover indicator (thin dashed border before selection) */}
              {!isSelected && !element.locked && (
                <div className="absolute inset-0 border border-dashed border-transparent group-hover/el:border-primary/30 rounded-sm pointer-events-none transition-colors" />
              )}
              {isSelected && !element.locked && (
                <SelectionOverlay
                  element={element}
                  canvasRef={canvasRef}
                  onResize={(w, h, x, y) => handleResize(element.id, w, h, x, y)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
