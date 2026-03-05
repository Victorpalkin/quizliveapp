'use client';

import { Star } from 'lucide-react';
import type { EvaluationMetric } from '@/lib/types';

interface ScaleRendererProps {
  metric: EvaluationMetric;
  itemId: string;
  ratings: Record<string, Record<string, number>>;
  onRate: (itemId: string, metricId: string, value: number) => void;
}

export function StarScale({ metric, itemId, ratings, onRate }: ScaleRendererProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }).map((_, i) => {
        const value = metric.scaleMin + i;
        const isSelected = (ratings[itemId]?.[metric.id] || 0) >= value;
        return (
          <button
            key={value}
            onClick={() => onRate(itemId, metric.id, value)}
            className="p-2 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`h-8 w-8 ${
                isSelected
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function NumericScale({ metric, itemId, ratings, onRate }: ScaleRendererProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: metric.scaleMax - metric.scaleMin + 1 }).map((_, i) => {
        const value = metric.scaleMin + i;
        const isSelected = ratings[itemId]?.[metric.id] === value;
        return (
          <button
            key={value}
            onClick={() => onRate(itemId, metric.id, value)}
            className={`w-12 h-12 rounded-full border-2 text-lg font-medium transition-all active:scale-95 ${
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted-foreground/30 hover:border-primary'
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

export function LabelScale({ metric, itemId, ratings, onRate }: ScaleRendererProps) {
  if (!metric.scaleLabels) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {metric.scaleLabels.map((label, i) => {
        const value = i + 1;
        const isSelected = ratings[itemId]?.[metric.id] === value;
        return (
          <button
            key={value}
            onClick={() => onRate(itemId, metric.id, value)}
            className={`px-4 py-3 rounded-full border-2 font-medium transition-all active:scale-95 ${
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted-foreground/30 hover:border-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
