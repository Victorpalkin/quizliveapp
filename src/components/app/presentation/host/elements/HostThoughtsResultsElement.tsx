'use client';

import { useState, useEffect } from 'react';
import { useResponses } from '@/firebase/presentation';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface HostThoughtsResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostThoughtsResultsElement({ element, slides, gameId }: HostThoughtsResultsElementProps) {
  const { getElementResponses } = useResponses(gameId);
  const [thoughts, setThoughts] = useState<{ text: string; playerName: string }[]>([]);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.thoughtsConfig;

  useEffect(() => {
    if (!config || !element.sourceElementId) return;

    const loadResponses = async () => {
      const responses = await getElementResponses(element.sourceElementId!);
      const allThoughts: { text: string; playerName: string }[] = [];
      responses.forEach((r) => {
        if (r.textAnswers) {
          r.textAnswers.forEach((text) => {
            allThoughts.push({ text, playerName: r.playerName });
          });
        }
      });
      setThoughts(allThoughts);
    };

    loadResponses();
  }, [config, element.sourceElementId, getElementResponses]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source thoughts element linked
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-xl font-bold text-center mb-4 flex-shrink-0">{config.prompt}</h2>

      {/* Word cloud / thought cards */}
      <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto">
        {thoughts.map((t, i) => (
          <div
            key={i}
            className="bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-sm"
          >
            {t.text}
          </div>
        ))}
        {thoughts.length === 0 && (
          <div className="w-full text-center text-muted-foreground">No responses yet</div>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-2 flex-shrink-0">
        {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
