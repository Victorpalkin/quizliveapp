'use client';

import type { CSSProperties } from 'react';
import type { Frame } from '@/lib/types/canvas';
import type { SlideBackground } from '@/lib/types';
import { ElementRenderer } from './elements/ElementRenderer';

function backgroundStyle(background?: SlideBackground): CSSProperties {
  if (!background) return { backgroundColor: '#ffffff' };
  if (background.type === 'solid' && background.color) {
    return { backgroundColor: background.color };
  }
  if (background.type === 'gradient' && background.gradient) {
    return { background: background.gradient };
  }
  if (background.type === 'image' && background.imageUrl) {
    return {
      backgroundImage: `url(${background.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: '#ffffff' };
}

/** Renders a frame's elements read-only (no selection, drag, or resize). */
export function FrameContent({ frame }: { frame: Frame }) {
  const sorted = [...frame.elements].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div className="absolute inset-0 overflow-hidden" style={backgroundStyle(frame.background)}>
      {sorted.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            height: `${el.height}%`,
            zIndex: el.zIndex,
            opacity: el.opacity ?? 1,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
        >
          <ElementRenderer element={el} isSelected={false} />
        </div>
      ))}
    </div>
  );
}
