'use client';

import { Image as ImageIcon } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface ImageElementProps {
  element: SlideElement;
}

export function ImageElement({ element }: ImageElementProps) {
  if (!element.imageUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 rounded border-2 border-dashed border-muted-foreground/30">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <span className="text-xs text-muted-foreground">Click to upload image</span>
      </div>
    );
  }

  return (
    <img
      src={element.imageUrl}
      alt=""
      className="w-full h-full"
      style={{
        objectFit: element.objectFit || 'cover',
        borderRadius: element.borderRadius ? `${element.borderRadius}px` : undefined,
      }}
      draggable={false}
    />
  );
}
