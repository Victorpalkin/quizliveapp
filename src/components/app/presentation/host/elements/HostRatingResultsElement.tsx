'use client';

import { useState, useEffect } from 'react';
import { useResponses } from '@/firebase/presentation';
import { Star } from 'lucide-react';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface HostRatingResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostRatingResultsElement({ element, slides, gameId }: HostRatingResultsElementProps) {
  const { getElementResponses } = useResponses(gameId);
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.ratingConfig;

  useEffect(() => {
    if (!config || !element.sourceElementId) return;

    const loadResponses = async () => {
      const responses = await getElementResponses(element.sourceElementId!);
      const values = responses.filter((r) => r.ratingValue !== undefined).map((r) => r.ratingValue!);
      setTotal(values.length);
      if (values.length > 0) {
        setAverage(values.reduce((sum, v) => sum + v, 0) / values.length);
      }
    };

    loadResponses();
  }, [config, element.sourceElementId, getElementResponses]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source rating element linked
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-bold text-center mb-2">{config.itemTitle}</h2>

      {/* Average display */}
      <div className="text-5xl font-bold text-primary mb-2">
        {total > 0 ? average.toFixed(1) : '-'}
      </div>

      {config.metricType === 'stars' && (
        <div className="flex gap-1 mb-4">
          {Array.from({ length: config.max }, (_, i) => (
            <Star
              key={i}
              className={`h-8 w-8 ${i < Math.round(average) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {total} rating{total !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
