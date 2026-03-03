'use client';

import { useResponseCount } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface HostThoughtsElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostThoughtsElement({ element, gameId, playerCount }: HostThoughtsElementProps) {
  const config = element.thoughtsConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Prompt */}
      <h2 className="text-2xl font-bold text-center mb-6">
        {config.prompt}
      </h2>

      {/* Response counter */}
      <div className="text-4xl font-bold text-primary mb-2">{count}</div>
      <p className="text-muted-foreground">
        responses from {playerCount} player{playerCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
