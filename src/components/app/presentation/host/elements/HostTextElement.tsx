'use client';

import type { SlideElement } from '@/lib/types';

interface HostTextElementProps {
  element: SlideElement;
}

export function HostTextElement({ element }: HostTextElementProps) {
  return (
    <div
      className="w-full h-full flex items-center overflow-hidden"
      style={{
        fontSize: element.fontSize ? `${element.fontSize}px` : '24px',
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        fontFamily: element.fontFamily || 'inherit',
        textAlign: element.textAlign || 'left',
        color: element.color || '#000000',
        lineHeight: element.lineHeight || 1.4,
      }}
    >
      <div className="w-full whitespace-pre-wrap">{element.content || ''}</div>
    </div>
  );
}
