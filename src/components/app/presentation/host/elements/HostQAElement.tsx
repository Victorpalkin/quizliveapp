'use client';

import { useQuestions } from '@/firebase/presentation';
import { ThumbsUp, CheckCircle, Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SlideElement } from '@/lib/types';

interface HostQAElementProps {
  element: SlideElement;
  gameId: string;
}

export function HostQAElement({ element, gameId }: HostQAElementProps) {
  const config = element.qaConfig;
  const { questions, togglePin, markAnswered, deleteQuestion } = useQuestions(gameId);

  // Sort by pinned first, then by upvotes
  const sorted = [...questions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.upvotes - a.upvotes;
  });

  return (
    <div className="w-full h-full flex flex-col p-4" data-controls>
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
            className={`group flex items-start gap-3 p-3 rounded-lg border ${
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
            <div className="flex items-center gap-1">
              {/* Status indicators (always visible) */}
              {q.pinned && <Pin className="h-4 w-4 text-primary" />}
              {q.answered && <CheckCircle className="h-4 w-4 text-green-500" />}

              {/* Moderation buttons (visible on hover) */}
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => togglePin(q.id, !q.pinned)}
                  title={q.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className={`h-3.5 w-3.5 ${q.pinned ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-green-500"
                  onClick={() => markAnswered(q.id, !q.answered)}
                  title={q.answered ? 'Mark unanswered' : 'Mark answered'}
                >
                  <CheckCircle className={`h-3.5 w-3.5 ${q.answered ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteQuestion(q.id)}
                  title="Delete question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
