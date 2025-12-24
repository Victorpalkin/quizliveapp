'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Activity, Trophy } from 'lucide-react';
import { SlideEditorProps } from '../types';

type ResultsMode = 'single' | 'comparison' | 'live';

const MODE_OPTIONS: { value: ResultsMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'single',
    label: 'Single Item',
    description: 'Detailed view of one item with distribution bars',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    value: 'comparison',
    label: 'Comparison',
    description: 'All items ranked side-by-side',
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    value: 'live',
    label: 'Live Results',
    description: 'Real-time updating view with animations',
    icon: <Activity className="h-5 w-5" />,
  },
];

export function RatingResultsEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const sourceSlideId = slide.sourceSlideId || '';
  const resultsMode = slide.ratingResultsMode || 'single';
  const comparisonSlideIds = slide.comparisonSlideIds || [];

  // Find all rating-input slides
  const ratingInputSlides = presentation.slides.filter(s => s.type === 'rating-input');

  // Get the corresponding describe slide for display
  const getItemTitle = (inputSlide: typeof ratingInputSlides[0]) => {
    const describeSlide = presentation.slides.find(s => s.id === inputSlide.ratingInputSlideId);
    return describeSlide?.ratingItem?.title || 'Untitled Item';
  };

  const handleModeChange = useCallback((value: ResultsMode) => {
    onSlideChange({
      ...slide,
      ratingResultsMode: value,
      // Clear source slide for comparison mode (uses all or selected)
      sourceSlideId: value === 'comparison' ? undefined : slide.sourceSlideId,
    });
  }, [slide, onSlideChange]);

  const handleSourceChange = useCallback((value: string) => {
    onSlideChange({ ...slide, sourceSlideId: value });
  }, [slide, onSlideChange]);

  const handleComparisonSlideToggle = useCallback((slideId: string, checked: boolean) => {
    const newIds = checked
      ? [...comparisonSlideIds, slideId]
      : comparisonSlideIds.filter(id => id !== slideId);
    onSlideChange({ ...slide, comparisonSlideIds: newIds });
  }, [slide, comparisonSlideIds, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Results Mode Selection */}
      <div className="space-y-2">
        <Label>Display Mode</Label>
        <div className="grid grid-cols-1 gap-2">
          {MODE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all ${
                resultsMode === option.value
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleModeChange(option.value)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`${resultsMode === option.value ? 'text-primary' : 'text-muted-foreground'}`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    resultsMode === option.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Source Rating Slide - for single and live modes */}
      {(resultsMode === 'single' || resultsMode === 'live') && (
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
            {resultsMode === 'live'
              ? 'Show live results as participants submit ratings'
              : 'Choose which rated item\'s results to display'}
          </p>
        </div>
      )}

      {/* Comparison Slides Selection - for comparison mode */}
      {resultsMode === 'comparison' && (
        <div className="space-y-2">
          <Label>Items to Compare</Label>
          {ratingInputSlides.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              No rating items found. Add &quot;Rating&quot; slides first.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {ratingInputSlides.map((inputSlide) => (
                <div key={inputSlide.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`compare-${inputSlide.id}`}
                    checked={comparisonSlideIds.includes(inputSlide.id)}
                    onCheckedChange={(checked) =>
                      handleComparisonSlideToggle(inputSlide.id, checked === true)
                    }
                  />
                  <label
                    htmlFor={`compare-${inputSlide.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {getItemTitle(inputSlide)}
                  </label>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {comparisonSlideIds.length === 0
              ? 'Leave empty to compare all rated items'
              : `${comparisonSlideIds.length} item${comparisonSlideIds.length !== 1 ? 's' : ''} selected`}
          </p>
        </div>
      )}
    </div>
  );
}
