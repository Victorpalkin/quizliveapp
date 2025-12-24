'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, BarChart3, Flame, Grid3X3, Info } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SummaryView = 'ranking' | 'chart' | 'heatmap' | 'matrix';

const VIEW_OPTIONS: { value: SummaryView; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'ranking',
    label: 'Ranking List',
    icon: <Trophy className="h-4 w-4" />,
    description: 'Ranked list with progress bars',
  },
  {
    value: 'chart',
    label: 'Bar Chart',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Horizontal bar chart visualization',
  },
  {
    value: 'heatmap',
    label: 'Heatmap',
    icon: <Flame className="h-4 w-4" />,
    description: 'Rating distribution heatmap',
  },
];

export function RatingSummaryEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  // Count rating-input slides in the presentation
  const ratingInputSlides = presentation.slides.filter(s => s.type === 'rating-input');
  const ratingInputCount = ratingInputSlides.length;

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({ ...slide, summaryTitle: e.target.value });
  }, [slide, onSlideChange]);

  const handleDefaultViewChange = useCallback((value: string) => {
    onSlideChange({
      ...slide,
      summaryDefaultView: value as SummaryView,
    });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Info about what this slide shows */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This slide shows a comprehensive summary of all rated items with multiple visualization options.
          {ratingInputCount > 0 ? (
            <span className="font-medium"> Currently tracking {ratingInputCount} items.</span>
          ) : (
            <span className="text-destructive"> Add rating slides before this summary.</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="summary-title">Title</Label>
        <Input
          id="summary-title"
          value={slide.summaryTitle || ''}
          onChange={handleTitleChange}
          placeholder="Rating Summary"
        />
      </div>

      {/* Default View Selection */}
      <div className="space-y-2">
        <Label>Default View</Label>
        <p className="text-sm text-muted-foreground mb-2">
          The view that displays first (participants can switch views during the presentation)
        </p>
        <Select
          value={slide.summaryDefaultView || 'ranking'}
          onValueChange={handleDefaultViewChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {option.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview of tracked items */}
      {ratingInputCount > 0 && (
        <div className="space-y-2">
          <Label>Items Being Rated</Label>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                {ratingInputSlides.map((inputSlide, index) => {
                  const describeSlide = presentation.slides.find(
                    s => s.id === inputSlide.ratingInputSlideId
                  );
                  const title = describeSlide?.ratingItem?.title || 'Untitled';
                  return (
                    <div
                      key={inputSlide.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{title}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
