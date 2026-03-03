'use client';

import { Users } from 'lucide-react';

interface HostOverlayProps {
  gamePin: string;
  slideIndex: number;
  totalSlides: number;
  playerCount: number;
}

export function HostOverlay({ gamePin, slideIndex, totalSlides, playerCount }: HostOverlayProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/40 to-transparent text-white">
      {/* PIN */}
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70">PIN</span>
        <span className="font-mono font-bold text-lg tracking-wider">{gamePin}</span>
      </div>

      {/* Slide counter */}
      <div className="text-sm font-mono opacity-80">
        {slideIndex + 1} / {totalSlides}
      </div>

      {/* Player count */}
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 opacity-70" />
        <span className="font-bold">{playerCount}</span>
      </div>
    </div>
  );
}
