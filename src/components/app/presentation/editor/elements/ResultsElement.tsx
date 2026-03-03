'use client';

import { BarChart3 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface ResultsElementProps {
  element: SlideElement;
}

const RESULTS_CONFIG: Record<string, { label: string; color: string }> = {
  'quiz-results': { label: 'Quiz Results', color: 'text-purple-500' },
  'poll-results': { label: 'Poll Results', color: 'text-teal-500' },
  'thoughts-results': { label: 'Thoughts Results', color: 'text-blue-500' },
  'rating-results': { label: 'Rating Results', color: 'text-orange-500' },
};

export function ResultsElement({ element }: ResultsElementProps) {
  const config = RESULTS_CONFIG[element.type] || { label: 'Results', color: 'text-muted-foreground' };

  return (
    <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-2 p-3">
      <BarChart3 className={`h-8 w-8 ${config.color}`} />
      <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
      {element.sourceElementId ? (
        <span className="text-[10px] text-muted-foreground/70">
          Source: {element.sourceElementId.slice(0, 8)}...
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground/70">
          Click to select source element
        </span>
      )}
    </div>
  );
}
