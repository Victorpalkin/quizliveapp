'use client';

import { ANSWER_COLORS } from '@/lib/constants';
import { useResponseCount } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface HostPollElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostPollElement({ element, gameId, playerCount }: HostPollElementProps) {
  const config = element.pollConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Question */}
      <h2 className="text-2xl font-bold text-center mb-4 flex-shrink-0">
        {config.question}
      </h2>

      {/* Options as bars */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        {config.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 text-right truncate">{opt.text}</span>
            <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: '0%',
                  backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Response counter */}
      <div className="text-sm text-muted-foreground text-center mt-3 flex-shrink-0">
        {count} / {playerCount} voted
      </div>
    </div>
  );
}
