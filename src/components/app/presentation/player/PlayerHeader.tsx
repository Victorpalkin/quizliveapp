'use client';

import { Flame } from 'lucide-react';

interface PlayerHeaderProps {
  playerName: string;
  score: number;
  streak: number;
}

export function PlayerHeader({ playerName, score, streak }: PlayerHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background border-b flex-shrink-0">
      <span className="font-medium text-sm truncate max-w-[120px]">{playerName}</span>
      <div className="flex items-center gap-3">
        {streak >= 2 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-bold">{streak}</span>
          </div>
        )}
        <span className="text-sm font-mono font-bold">{score.toLocaleString()}</span>
      </div>
    </div>
  );
}
