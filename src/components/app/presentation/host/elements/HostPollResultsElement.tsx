'use client';

import { useState, useEffect } from 'react';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponses } from '@/firebase/presentation';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface HostPollResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostPollResultsElement({ element, slides, gameId }: HostPollResultsElementProps) {
  const { getElementResponses } = useResponses(gameId);
  const [distribution, setDistribution] = useState<number[]>([]);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.pollConfig;

  useEffect(() => {
    if (!config || !element.sourceElementId) return;

    const loadResponses = async () => {
      const responses = await getElementResponses(element.sourceElementId!);
      const dist = new Array(config.options.length).fill(0);
      responses.forEach((r) => {
        if (r.answerIndex !== undefined) {
          if (r.answerIndex < dist.length) dist[r.answerIndex]++;
        }
        if (r.answerIndices) {
          r.answerIndices.forEach((idx) => {
            if (idx < dist.length) dist[idx]++;
          });
        }
      });
      setDistribution(dist);
    };

    loadResponses();
  }, [config, element.sourceElementId, getElementResponses]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source poll element linked
      </div>
    );
  }

  const maxCount = Math.max(...distribution, 1);
  const total = distribution.reduce((sum, n) => sum + n, 0);

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-xl font-bold text-center mb-4 flex-shrink-0">{config.question}</h2>

      <div className="flex-1 flex flex-col justify-center gap-3">
        {config.options.map((opt, i) => {
          const pct = total > 0 ? (distribution[i] / total) * 100 : 0;

          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-medium w-28 text-right truncate">{opt.text}</span>
              <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{
                    width: `${(distribution[i] / maxCount) * 100}%`,
                    backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length],
                  }}
                />
              </div>
              <span className="text-sm font-mono w-16 text-right">
                {distribution[i]} ({pct.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
