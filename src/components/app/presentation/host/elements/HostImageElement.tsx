'use client';

import Image from 'next/image';
import type { SlideElement } from '@/lib/types';

interface HostImageElementProps {
  element: SlideElement;
}

export function HostImageElement({ element }: HostImageElementProps) {
  if (!element.imageUrl) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{ borderRadius: element.borderRadius ? `${element.borderRadius}px` : undefined }}
    >
      <Image
        src={element.imageUrl}
        alt=""
        fill
        className="object-cover"
        style={{ objectFit: element.objectFit || 'cover' }}
        unoptimized
      />
    </div>
  );
}
