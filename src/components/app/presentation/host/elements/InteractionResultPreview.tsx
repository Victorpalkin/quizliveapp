'use client';

import { useMemo } from 'react';
import { useElementResponses } from '@/firebase/presentation/use-responses';
import { Star } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface InteractionResultPreviewProps {
  gameId: string;
  element: SlideElement;
}

export function InteractionResultPreview({ gameId, element }: InteractionResultPreviewProps) {
  const responses = useElementResponses(gameId, element.id);

  if (responses.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground italic">No responses yet</p>
    );
  }

  switch (element.type) {
    case 'poll':
      return <PollPreview element={element} responses={responses} />;
    case 'quiz':
      return <QuizPreview element={element} responses={responses} />;
    case 'thoughts':
      return <ThoughtsPreview responses={responses} />;
    case 'rating':
      return <RatingPreview element={element} responses={responses} />;
    case 'evaluation':
      return <EvaluationPreview element={element} responses={responses} />;
    default:
      return <p className="text-[10px] text-muted-foreground">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>;
  }
}

function PollPreview({ element, responses }: { element: SlideElement; responses: { answerIndex?: number; answerIndices?: number[] }[] }) {
  const options = element.pollConfig?.options ?? [];

  const counts = useMemo(() => {
    const c = new Array(options.length).fill(0);
    for (const r of responses) {
      if (r.answerIndices) {
        for (const idx of r.answerIndices) {
          if (idx >= 0 && idx < c.length) c[idx]++;
        }
      } else if (r.answerIndex !== undefined && r.answerIndex >= 0 && r.answerIndex < c.length) {
        c[r.answerIndex]++;
      }
    }
    return c;
  }, [responses, options.length]);

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="space-y-1">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <span className="truncate min-w-0 flex-1">{opt.text}</span>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${(counts[i] / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground w-4 text-right flex-shrink-0">{counts[i]}</span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">{responses.length} vote{responses.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

function QuizPreview({ element, responses }: { element: SlideElement; responses: { answerIndex?: number }[] }) {
  const correctIndex = element.quizConfig?.correctAnswerIndex;
  const correct = responses.filter((r) => r.answerIndex === correctIndex).length;
  const total = responses.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px]">
        <span className={correct > total / 2 ? 'text-green-500' : 'text-amber-500'}>{pct}% correct</span>
        <span className="text-muted-foreground">({correct}/{total})</span>
      </div>
    </div>
  );
}

function ThoughtsPreview({ responses }: { responses: { textAnswers?: string[] }[] }) {
  const allAnswers = responses.flatMap((r) => r.textAnswers ?? []).filter(Boolean);
  const shown = allAnswers.slice(0, 5);

  return (
    <div className="space-y-1">
      {shown.map((text, i) => (
        <p key={i} className="text-[10px] text-muted-foreground truncate">&quot;{text}&quot;</p>
      ))}
      {allAnswers.length > 5 && (
        <p className="text-[10px] text-muted-foreground/60">+{allAnswers.length - 5} more</p>
      )}
    </div>
  );
}

function RatingPreview({ element, responses }: { element: SlideElement; responses: { ratingValue?: number; ratingValues?: Record<string, number> }[] }) {
  const config = element.ratingConfig;
  const items = config?.items && config.items.length > 0 ? config.items : null;

  if (items) {
    const avgs = items.map((item) => {
      const values = responses
        .map((r) => r.ratingValues?.[item.id])
        .filter((v): v is number => v !== undefined && v !== null);
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { text: item.text, avg, count: values.length };
    });

    return (
      <div className="space-y-1">
        {avgs.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="truncate min-w-0 flex-1">{item.text}</span>
            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            <span className="text-muted-foreground flex-shrink-0">{item.count > 0 ? item.avg.toFixed(1) : '-'}</span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">{responses.length} rating{responses.length !== 1 ? 's' : ''}</p>
      </div>
    );
  }

  const values = responses.filter((r) => r.ratingValue !== undefined).map((r) => r.ratingValue!);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
      <span>{values.length > 0 ? avg.toFixed(1) : '-'}</span>
      <span className="text-muted-foreground">({values.length} rating{values.length !== 1 ? 's' : ''})</span>
    </div>
  );
}

function EvaluationPreview({ element, responses }: { element: SlideElement; responses: { evaluationRatings?: Record<string, Record<string, number>> }[] }) {
  const items = element.evaluationConfig?.items ?? [];
  const metrics = element.evaluationConfig?.metrics ?? [];

  const ranked = useMemo(() => {
    if (items.length === 0 || metrics.length === 0) return [];

    return items.map((item) => {
      let totalScore = 0;
      let count = 0;
      for (const r of responses) {
        const itemRatings = r.evaluationRatings?.[item.id];
        if (itemRatings) {
          const avg = Object.values(itemRatings).reduce((a, b) => a + b, 0) / Object.values(itemRatings).length;
          totalScore += avg;
          count++;
        }
      }
      return { text: item.text, avg: count > 0 ? totalScore / count : 0, count };
    }).sort((a, b) => b.avg - a.avg);
  }, [items, metrics.length, responses]);

  return (
    <div className="space-y-1">
      {ranked.slice(0, 5).map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground w-3 flex-shrink-0">{i + 1}.</span>
          <span className="truncate min-w-0 flex-1">{item.text}</span>
          <span className="text-muted-foreground flex-shrink-0">{item.count > 0 ? item.avg.toFixed(1) : '-'}</span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
