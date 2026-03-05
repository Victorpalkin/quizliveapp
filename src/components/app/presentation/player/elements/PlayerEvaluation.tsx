'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useResponses } from '@/firebase/presentation';
import { StarScale, NumericScale, LabelScale } from '@/components/app/scale-renderers';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { SlideElement, EvaluationMetric } from '@/lib/types';

interface PlayerEvaluationProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

export function PlayerEvaluation({ element, gameId, playerId, playerName, onSubmitted }: PlayerEvaluationProps) {
  const config = element.evaluationConfig;
  const { submitResponse } = useResponses(gameId);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleRate = useCallback((itemId: string, metricId: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [metricId]: value },
    }));
  }, []);

  if (!config) return null;

  const items = config.items;
  const metrics: EvaluationMetric[] = config.metrics.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    scaleType: m.scaleType,
    scaleMin: m.scaleMin,
    scaleMax: m.scaleMax,
    scaleLabels: m.scaleLabels,
    weight: m.weight,
    lowerIsBetter: m.lowerIsBetter,
  }));
  const currentItem = items[currentItemIndex];

  // Check if all metrics are rated for current item
  const currentItemComplete = currentItem
    ? metrics.every((m) => ratings[currentItem.id]?.[m.id] !== undefined)
    : false;

  // Count how many items are fully rated
  const ratedItemCount = items.filter((item) =>
    metrics.every((m) => ratings[item.id]?.[m.id] !== undefined)
  ).length;

  const allComplete = ratedItemCount === items.length;

  const handleSubmit = async () => {
    if (!allComplete || submitting) return;
    setSubmitting(true);
    try {
      await submitResponse({
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        evaluationRatings: ratings,
      });
      onSubmitted();
    } catch {
      // Keep state on error
    } finally {
      setSubmitting(false);
    }
  };

  const ScaleComponent = (metric: EvaluationMetric) => {
    switch (metric.scaleType) {
      case 'stars':
        return <StarScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRate} />;
      case 'numeric':
        return <NumericScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRate} />;
      case 'labels':
        return <LabelScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRate} />;
      default:
        return <StarScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRate} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-lg font-bold">{config.title}</h2>
        {config.description && (
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        )}
      </motion.div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {items.map((item, i) => {
            const isComplete = metrics.every((m) => ratings[item.id]?.[m.id] !== undefined);
            return (
              <button
                key={item.id}
                onClick={() => setCurrentItemIndex(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentItemIndex
                    ? 'bg-primary scale-125'
                    : isComplete
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/30'
                }`}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {ratedItemCount}/{items.length}
        </span>
      </div>

      {/* Current item */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="glass rounded-xl p-4 text-center">
            <h3 className="text-lg font-semibold">{currentItem.text}</h3>
            {currentItem.description && (
              <p className="text-sm text-muted-foreground mt-1">{currentItem.description}</p>
            )}
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.id} className="space-y-2">
                <div className="text-center">
                  <p className="font-medium text-sm">{metric.name}</p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  )}
                </div>
                <div className="flex justify-center">
                  {ScaleComponent(metric)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrentItemIndex((i) => i - 1)}
          disabled={currentItemIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentItemIndex < items.length - 1 ? (
          <Button
            onClick={() => setCurrentItemIndex((i) => i + 1)}
            disabled={!currentItemComplete}
            className="flex-1"
            variant="gradient"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allComplete || submitting}
            className="flex-1"
            variant="gradient"
          >
            {submitting ? 'Submitting...' : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Submit All
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
