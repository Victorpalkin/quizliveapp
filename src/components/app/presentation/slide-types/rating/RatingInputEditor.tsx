'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlideEditorProps } from '../types';
import { PresentationRatingMetric } from '@/lib/types';

const SCALE_TYPES = [
  { value: 'stars', label: 'Stars (1-5)' },
  { value: 'numeric', label: 'Numeric Scale' },
  { value: 'labels', label: 'Custom Labels' },
] as const;

const MAX_VALUES = [3, 5, 7, 10];

export function RatingInputEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const metric = slide.ratingMetric || { type: 'stars', min: 1, max: 5 };

  // Find the linked describe slide to show context
  const describeSlide = presentation.slides.find(s => s.id === slide.sourceDescribeSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Linked item';

  const handleTypeChange = useCallback((value: string) => {
    const newType = value as PresentationRatingMetric['type'];
    const newMetric: PresentationRatingMetric = {
      ...metric,
      type: newType,
      min: 1,
      max: newType === 'stars' ? 5 : newType === 'numeric' ? 10 : (metric.labels?.length || 5),
    };
    onSlideChange({ ...slide, ratingMetric: newMetric });
  }, [slide, metric, onSlideChange]);

  const handleMaxChange = useCallback((value: string) => {
    onSlideChange({
      ...slide,
      ratingMetric: { ...metric, max: parseInt(value) },
    });
  }, [slide, metric, onSlideChange]);

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({
      ...slide,
      ratingMetric: { ...metric, question: e.target.value },
    });
  }, [slide, metric, onSlideChange]);

  const handleLabelsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const labels = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
    onSlideChange({
      ...slide,
      ratingMetric: { ...metric, labels, max: labels.length },
    });
  }, [slide, metric, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Linked Item Info */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Rating for: <span className="font-medium text-foreground">{itemTitle}</span>
        </p>
      </div>

      {/* Rating Question */}
      <div className="space-y-2">
        <Label htmlFor="rating-question">Rating Question</Label>
        <Input
          id="rating-question"
          value={metric.question || ''}
          onChange={handleQuestionChange}
          placeholder="How would you rate this?"
        />
        <p className="text-sm text-muted-foreground">
          The question shown to participants when rating
        </p>
      </div>

      {/* Scale Type */}
      <div className="space-y-2">
        <Label>Scale Type</Label>
        <Select value={metric.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCALE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Max Value (for stars and numeric) */}
      {(metric.type === 'stars' || metric.type === 'numeric') && (
        <div className="space-y-2">
          <Label>Maximum Value</Label>
          <Select value={String(metric.max)} onValueChange={handleMaxChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAX_VALUES.map((val) => (
                <SelectItem key={val} value={String(val)}>
                  1 to {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Labels */}
      {metric.type === 'labels' && (
        <div className="space-y-2">
          <Label htmlFor="rating-labels">Labels (comma-separated)</Label>
          <Input
            id="rating-labels"
            value={metric.labels?.join(', ') || ''}
            onChange={handleLabelsChange}
            placeholder="Poor, Fair, Good, Excellent"
          />
          <p className="text-sm text-muted-foreground">
            Enter labels separated by commas
          </p>
        </div>
      )}
    </div>
  );
}
