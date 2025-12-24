'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlideEditorProps } from '../types';

export function RatingResultsEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const sourceSlideId = slide.sourceSlideId || '';

  // Find all rating-input slides
  const ratingInputSlides = presentation.slides.filter(s => s.type === 'rating-input');

  // Get the corresponding describe slide for display
  const getItemTitle = (inputSlide: typeof ratingInputSlides[0]) => {
    const describeSlide = presentation.slides.find(s => s.id === inputSlide.ratingInputSlideId);
    return describeSlide?.ratingItem?.title || 'Untitled Item';
  };

  const handleSourceChange = useCallback((value: string) => {
    onSlideChange({ ...slide, sourceSlideId: value });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Source Rating Slide */}
      <div className="space-y-2">
        <Label>Show Results For</Label>
        {ratingInputSlides.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            No rating items found. Add a &quot;Rating&quot; slide first.
          </p>
        ) : (
          <Select value={sourceSlideId} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a rated item" />
            </SelectTrigger>
            <SelectContent>
              {ratingInputSlides.map((inputSlide) => (
                <SelectItem key={inputSlide.id} value={inputSlide.id}>
                  {getItemTitle(inputSlide)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-sm text-muted-foreground">
          Choose which rated item&apos;s results to display
        </p>
      </div>

      {/* Future: Add mode selector (single/comparison/live) */}
      {/* For now, single item results only */}
    </div>
  );
}
