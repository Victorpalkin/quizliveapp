'use client';

import type { SlideElement } from '@/lib/types';

interface ShapeElementProps {
  element: SlideElement;
}

export function ShapeElement({ element }: ShapeElementProps) {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: element.backgroundColor || '#e2e8f0',
    borderColor: element.borderColor || '#94a3b8',
    borderWidth: element.borderWidth ?? 2,
    borderStyle: 'solid',
  };

  switch (element.shapeType) {
    case 'circle':
      style.borderRadius = '50%';
      break;
    case 'rounded-rect':
      style.borderRadius = '12px';
      break;
    case 'line':
      style.height = `${element.borderWidth || 2}px`;
      style.backgroundColor = element.borderColor || '#94a3b8';
      style.borderWidth = 0;
      style.position = 'absolute';
      style.top = '50%';
      style.transform = 'translateY(-50%)';
      break;
    default:
      break;
  }

  return <div style={style} />;
}
