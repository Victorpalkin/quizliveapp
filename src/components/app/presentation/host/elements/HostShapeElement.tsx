'use client';

import type { SlideElement } from '@/lib/types';

interface HostShapeElementProps {
  element: SlideElement;
}

export function HostShapeElement({ element }: HostShapeElementProps) {
  const bg = element.backgroundColor || '#e2e8f0';
  const borderColor = element.borderColor || '#94a3b8';
  const borderWidth = element.borderWidth ?? 2;
  const shapeType = element.shapeType || 'rectangle';

  if (shapeType === 'line') {
    return (
      <div className="w-full h-full flex items-center">
        <div
          className="w-full"
          style={{
            height: `${borderWidth}px`,
            backgroundColor: borderColor,
          }}
        />
      </div>
    );
  }

  const borderRadius =
    shapeType === 'circle'
      ? '50%'
      : shapeType === 'rounded-rect'
      ? '12px'
      : '0';

  return (
    <div
      className="w-full h-full"
      style={{
        backgroundColor: bg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius,
      }}
    />
  );
}
