'use client';

import { useQuestions } from '@/firebase/presentation';
import { ThumbsUp, CheckCircle, Pin } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostQAElementProps {
  element: SlideElement;
  gameId: string;
}

export function HostQAElement({ element, gameId }: HostQAElementProps) {
  const config = element.qaConfig;
  const { questions } = useQuestions(gameId);

  // Sort by pinned first, then by upvotes
  const sorted = [...questions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.upvotes - a.upvotes;
  });

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-2xl font-bold text-center mb-4 flex-shrink-0">
        {config?.topic ? `Q&A: ${config.topic}` : 'Audience Questions'}
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3">
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No questions yet. Ask your audience to submit questions!
          </p>
        )}
        {sorted.map((q) => (
          <div
            key={q.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              q.pinned ? 'bg-primary/5 border-primary/20' : 'bg-background'
            } ${q.answered ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm font-mono">{q.upvotes}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{q.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{q.playerName}</p>
            </div>
            <div className="flex gap-1">
              {q.pinned && <Pin className="h-4 w-4 text-primary" />}
              {q.answered && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
