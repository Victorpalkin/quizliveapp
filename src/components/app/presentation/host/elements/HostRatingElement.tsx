'use client';

import { useResponseCount } from '@/firebase/presentation';
import { Star } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostRatingElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostRatingElement({ element, gameId, playerCount }: HostRatingElementProps) {
  const config = element.ratingConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center mb-2">{config.itemTitle}</h2>
      {config.itemDescription && (
        <p className="text-muted-foreground text-center mb-4">{config.itemDescription}</p>
      )}
      {config.question && (
        <p className="text-lg text-center mb-6">{config.question}</p>
      )}

      {/* Rating display */}
      {config.metricType === 'stars' && (
        <div className="flex gap-2 mb-4">
          {Array.from({ length: config.max }, (_, i) => (
            <Star key={i} className="h-10 w-10 text-muted-foreground/30" />
          ))}
        </div>
      )}

      {/* Response counter */}
      <p className="text-sm text-muted-foreground">
        {count} / {playerCount} rated
      </p>
    </div>
  );
}
