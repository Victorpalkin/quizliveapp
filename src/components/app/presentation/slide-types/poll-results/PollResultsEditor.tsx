'use client';

import { useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, ListChecks, Info } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;
type DisplayMode = 'individual' | 'combined';

const DISPLAY_OPTIONS: { value: DisplayMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'individual',
    label: 'Individual Questions',
    icon: <ListChecks className="h-4 w-4" />,
    description: 'Show each poll\'s results separately',
  },
  {
    value: 'combined',
    label: 'Combined Summary',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Compact grid with all polls',
  },
];

export function PollResultsEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  // Find all poll slides that appear BEFORE this results slide
  const availablePollSlides = useMemo(() => {
    const thisSlideOrder = slide.order;
    return presentation.slides
      .filter(s => s.type === 'poll' && s.order < thisSlideOrder)
      .sort((a, b) => a.order - b.order);
  }, [presentation.slides, slide.order]);

  const selectedIds = slide.sourceSlideIds || [];

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({ ...slide, resultsTitle: e.target.value });
  }, [slide, onSlideChange]);

  const handleDisplayModeChange = useCallback((value: string) => {
    onSlideChange({
      ...slide,
      resultsDisplayMode: value as DisplayMode,
    });
  }, [slide, onSlideChange]);

  const handleSlideToggle = useCallback((slideId: string, checked: boolean) => {
    const current = slide.sourceSlideIds || [];
    const updated = checked
      ? [...current, slideId]
      : current.filter(id => id !== slideId);
    onSlideChange({ ...slide, sourceSlideIds: updated });
  }, [slide, onSlideChange]);

  const handleSelectAll = useCallback(() => {
    const allIds = availablePollSlides.map(s => s.id);
    onSlideChange({ ...slide, sourceSlideIds: allIds });
  }, [slide, onSlideChange, availablePollSlides]);

  const handleDeselectAll = useCallback(() => {
    onSlideChange({ ...slide, sourceSlideIds: [] });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Info about what this slide shows */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This slide displays results from selected polls, showing vote distributions.
          {availablePollSlides.length > 0 ? (
            <span className="font-medium"> {availablePollSlides.length} poll {availablePollSlides.length === 1 ? 'slide' : 'slides'} available.</span>
          ) : (
            <span className="text-destructive"> Add poll slides before this results slide.</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="results-title">Title</Label>
        <Input
          id="results-title"
          value={slide.resultsTitle || ''}
          onChange={handleTitleChange}
          placeholder="Poll Results"
        />
      </div>

      {/* Display Mode Selection */}
      <div className="space-y-2">
        <Label>Display Mode</Label>
        <Select
          value={slide.resultsDisplayMode || 'individual'}
          onValueChange={handleDisplayModeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISPLAY_OPTIONS.map((option) => (
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

      {/* Poll Slide Selection */}
      {availablePollSlides.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Polls</Label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {availablePollSlides.map((pollSlide, index) => {
                  const question = pollSlide.question as PollQuestion | undefined;
                  const questionText = question?.text || 'Untitled poll';
                  const isSelected = selectedIds.includes(pollSlide.id);
                  const isMultiple = question?.type === 'poll-multiple';

                  return (
                    <div
                      key={pollSlide.id}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={`poll-${pollSlide.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSlideToggle(pollSlide.id, checked === true)
                        }
                      />
                      <label
                        htmlFor={`poll-${pollSlide.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">P{index + 1}:</span>
                          <span className="truncate">{questionText}</span>
                          {isMultiple && (
                            <span className="text-xs text-muted-foreground">(multi)</span>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {selectedIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'poll' : 'polls'} selected
            </p>
          )}
        </div>
      )}

      {availablePollSlides.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No poll slides found before this slide.</p>
            <p className="text-sm mt-1">Add poll slides earlier in the presentation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
