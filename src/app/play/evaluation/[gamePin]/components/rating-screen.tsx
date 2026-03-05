'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Send, ArrowUp, ArrowDown } from 'lucide-react';
import { StarScale, NumericScale, LabelScale } from './scale-renderers';
import type { EvaluationItem, EvaluationMetric } from '@/lib/types';

interface RatingScreenProps {
  approvedItems: EvaluationItem[];
  currentItem: EvaluationItem;
  currentItemIndex: number;
  setCurrentItemIndex: (index: number) => void;
  metrics: EvaluationMetric[];
  ratings: Record<string, Record<string, number>>;
  progress: number;
  currentRatingsCount: number;
  totalRatingsNeeded: number;
  isSubmitting: boolean;
  handleRateMetric: (itemId: string, metricId: string, value: number) => void;
  handleSubmitRatings: () => void;
}

export function RatingScreen({
  approvedItems,
  currentItem,
  currentItemIndex,
  setCurrentItemIndex,
  metrics,
  ratings,
  progress,
  currentRatingsCount,
  totalRatingsNeeded,
  isSubmitting,
  handleRateMetric,
  handleSubmitRatings,
}: RatingScreenProps) {
  return (
    <>
      {/* Progress */}
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Item {currentItemIndex + 1} of {approvedItems.length}</span>
            <span>{currentRatingsCount} / {totalRatingsNeeded} ratings</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Item */}
      {currentItem && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{currentItem.text}</CardTitle>
            {currentItem.description && (
              <CardDescription>{currentItem.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {metrics.map((metric) => (
              <div key={metric.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    {metric.name}
                    {metric.lowerIsBetter ? (
                      <ArrowDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-green-500" />
                    )}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {metric.lowerIsBetter ? 'Lower is better' : 'Higher is better'}
                  </span>
                </div>
                {metric.description && (
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                )}

                {metric.scaleType === 'stars' && (
                  <StarScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRateMetric} />
                )}
                {metric.scaleType === 'numeric' && (
                  <NumericScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRateMetric} />
                )}
                {metric.scaleType === 'labels' && metric.scaleLabels && (
                  <LabelScale metric={metric} itemId={currentItem.id} ratings={ratings} onRate={handleRateMetric} />
                )}
              </div>
            ))}

            {/* Navigation */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                disabled={currentItemIndex === 0}
                className="flex-1"
              >
                Previous
              </Button>
              {currentItemIndex < approvedItems.length - 1 ? (
                <Button
                  onClick={() => setCurrentItemIndex(currentItemIndex + 1)}
                  className="flex-1"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitRatings}
                  disabled={isSubmitting || currentRatingsCount === 0}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 active:scale-95 transition-transform"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Ratings
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Navigation Dots */}
      <div className="flex justify-center gap-1">
        {approvedItems.map((item, index) => {
          const hasRatings = Object.keys(ratings[item.id] || {}).length > 0;
          const isComplete = Object.keys(ratings[item.id] || {}).length === metrics.length;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentItemIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentItemIndex
                  ? 'bg-primary scale-125'
                  : isComplete
                  ? 'bg-green-500'
                  : hasRatings
                  ? 'bg-yellow-500'
                  : 'bg-muted-foreground/30'
              }`}
            />
          );
        })}
      </div>
    </>
  );
}
