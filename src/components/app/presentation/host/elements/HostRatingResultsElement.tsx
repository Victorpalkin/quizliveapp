'use client';

import { useState, useEffect } from 'react';
import { useResponses, useDynamicItems } from '@/firebase/presentation';
import { Star, Loader2 } from 'lucide-react';
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
  const [itemAverages, setItemAverages] = useState<{ id: string; text: string; avg: number; count: number }[]>([]);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.ratingConfig;

  // Load dynamic items from AI step if configured on source element
  const { items: dynamicItems, isLoading } = useDynamicItems(gameId, sourceElement?.dynamicItemsSource);

  useEffect(() => {
    if (!config || !element.sourceElementId) return;

    const loadResponses = async () => {
      const responses = await getElementResponses(element.sourceElementId!);

      // Check if any response has ratingValues (multi-item)
      const hasMultiItem = responses.some((r) => r.ratingValues && Object.keys(r.ratingValues).length > 0);

      if (hasMultiItem) {
        // Resolve items: dynamic > static config > legacy
        const items = dynamicItems
          || (config.items && config.items.length > 0 ? config.items : null)
          || [{ id: 'legacy', text: config.itemTitle }];

        const avgs = items.map((item) => {
          const values = responses
            .map((r) => r.ratingValues?.[item.id])
            .filter((v): v is number => v !== undefined && v !== null);
          const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          return { id: item.id, text: item.text, avg, count: values.length };
        });

        setItemAverages(avgs);
        setTotal(responses.length);

        const allValues = avgs.filter((a) => a.count > 0);
        if (allValues.length > 0) {
          setAverage(allValues.reduce((sum, a) => sum + a.avg, 0) / allValues.length);
        }
      } else {
        const values = responses.filter((r) => r.ratingValue !== undefined).map((r) => r.ratingValue!);
        setTotal(values.length);
        setItemAverages([]);
        if (values.length > 0) {
          setAverage(values.reduce((sum, v) => sum + v, 0) / values.length);
        }
      }
    };

    loadResponses();
  }, [config, element.sourceElementId, getElementResponses, dynamicItems]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source rating element linked
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Multi-item results
  if (itemAverages.length > 1) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-center mb-4">
          {config.question || config.itemTitle}
        </h2>

        <div className="w-full max-w-md space-y-2 mb-4">
          {itemAverages.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.text}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {config.metricType === 'stars' && (
                  <Star className={`h-4 w-4 ${item.count > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                )}
                <span className="font-bold text-lg min-w-[2.5rem] text-right">
                  {item.count > 0 ? item.avg.toFixed(1) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {total} rating{total !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  // Single-item results
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-bold text-center mb-2">{config.itemTitle}</h2>

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
