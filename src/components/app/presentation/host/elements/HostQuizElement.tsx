'use client';

import { ANSWER_COLORS } from '@/lib/constants';
import { useResponseCount } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface HostQuizElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostQuizElement({ element, gameId, playerCount }: HostQuizElementProps) {
  const config = element.quizConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Question */}
      <h2 className="text-2xl font-bold text-center mb-4 flex-shrink-0">
        {config.question}
      </h2>

      {/* Answer grid */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {config.answers.map((answer, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-xl text-white font-semibold text-lg p-3"
            style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
          >
            {answer.text}
          </div>
        ))}
      </div>

      {/* Response counter */}
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground flex-shrink-0">
        <span>{count} / {playerCount} answered</span>
        {config.timeLimit > 0 && (
          <span className="font-mono text-lg font-bold text-foreground">
            {config.timeLimit}s
          </span>
        )}
      </div>
    </div>
  );
}
