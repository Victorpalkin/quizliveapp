'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SlideElement } from '@/lib/types';

interface TextElementProps {
  element: SlideElement;
  isSelected: boolean;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  onUpdateContent?: (content: string) => void;
}

export function TextElement({
  element,
  isSelected,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUpdateContent,
}: TextElementProps) {
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Select all text
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    if (editRef.current && onUpdateContent) {
      onUpdateContent(editRef.current.innerText);
    }
    onStopEditing?.();
  }, [onUpdateContent, onStopEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleBlur();
    }
    // Prevent shortcuts from firing while editing
    e.stopPropagation();
  }, [handleBlur]);

  const sharedStyle: React.CSSProperties = {
    fontSize: element.fontSize ? `${element.fontSize}px` : '24px',
    fontWeight: element.fontWeight || 'normal',
    fontStyle: element.fontStyle || 'normal',
    fontFamily: element.fontFamily || 'inherit',
    textAlign: element.textAlign || 'left',
    color: element.color || '#000000',
    lineHeight: element.lineHeight || 1.4,
    textDecoration: element.textDecoration === 'underline' ? 'underline' : undefined,
  };

  if (isEditing) {
    return (
      <div
        className="w-full h-full flex items-center overflow-hidden"
        style={sharedStyle}
      >
        <div
          ref={editRef}
          className="w-full whitespace-pre-wrap break-words outline-none ring-2 ring-primary/50 rounded-sm min-h-[1em]"
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {element.content || ''}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center overflow-hidden"
      style={sharedStyle}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEditing?.();
      }}
    >
      <div className="w-full whitespace-pre-wrap break-words">
        {element.content || 'Double-click to edit'}
      </div>
    </div>
  );
}
