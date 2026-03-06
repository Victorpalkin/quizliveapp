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
    case 'triangle':
      style.backgroundColor = 'transparent';
      style.borderWidth = 0;
      style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      style.backgroundColor = element.backgroundColor || '#e2e8f0';
      break;
    case 'arrow-right':
      style.backgroundColor = 'transparent';
      style.borderWidth = 0;
      style.clipPath = 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
      style.backgroundColor = element.backgroundColor || '#e2e8f0';
      break;
    case 'diamond':
      style.transform = 'rotate(45deg)';
      break;
    default:
      break;
  }

  return <div style={style} />;
}
