'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
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
import { BarChart3, ListChecks, Info, HelpCircle } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SingleChoiceQuestion } from '@/lib/types';

type DisplayMode = 'individual' | 'combined';

const DISPLAY_OPTIONS: { value: DisplayMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'individual',
    label: 'Individual Questions',
    icon: <ListChecks className="h-4 w-4" />,
    description: 'Show each question\'s results separately',
  },
  {
    value: 'combined',
    label: 'Combined Summary',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Compact grid with all questions',
  },
];

export function QuizResultsEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  // Find all quiz slides that appear BEFORE this results slide
  const availableQuizSlides = useMemo(() => {
    const thisSlideOrder = slide.order;
    return presentation.slides
      .filter(s => s.type === 'quiz' && s.order < thisSlideOrder)
      .sort((a, b) => a.order - b.order);
  }, [presentation.slides, slide.order]);

  const selectedIds = slide.sourceSlideIds || [];

  // Track if we've initialized auto-selection
  const hasInitialized = useRef(false);

  // Auto-select all quiz slides on first mount if none are selected
  useEffect(() => {
    if (!hasInitialized.current && availableQuizSlides.length > 0 && selectedIds.length === 0) {
      hasInitialized.current = true;
      const allIds = availableQuizSlides.map(s => s.id);
      onSlideChange({ ...slide, sourceSlideIds: allIds });
    }
  }, [availableQuizSlides, selectedIds.length, slide, onSlideChange]);

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
    const allIds = availableQuizSlides.map(s => s.id);
    onSlideChange({ ...slide, sourceSlideIds: allIds });
  }, [slide, onSlideChange, availableQuizSlides]);

  const handleDeselectAll = useCallback(() => {
    onSlideChange({ ...slide, sourceSlideIds: [] });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Info about what this slide shows */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This slide displays results from selected quiz questions, showing answer distributions
          and highlighting correct answers.
          {availableQuizSlides.length > 0 ? (
            <span className="font-medium"> {availableQuizSlides.length} quiz {availableQuizSlides.length === 1 ? 'slide' : 'slides'} available.</span>
          ) : (
            <span className="text-destructive"> Add quiz slides before this results slide.</span>
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
          placeholder="Quiz Results"
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

      {/* Quiz Slide Selection */}
      {availableQuizSlides.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Quiz Questions</Label>
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
                {availableQuizSlides.map((quizSlide, index) => {
                  const question = quizSlide.question as SingleChoiceQuestion | undefined;
                  const questionText = question?.text || 'Untitled question';
                  const isSelected = selectedIds.includes(quizSlide.id);

                  return (
                    <div
                      key={quizSlide.id}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={`quiz-${quizSlide.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSlideToggle(quizSlide.id, checked === true)
                        }
                      />
                      <label
                        htmlFor={`quiz-${quizSlide.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">Q{index + 1}:</span>
                          <span className="truncate">{questionText}</span>
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
              {selectedIds.length} {selectedIds.length === 1 ? 'question' : 'questions'} selected
            </p>
          )}
        </div>
      )}

      {availableQuizSlides.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No quiz slides found before this slide.</p>
            <p className="text-sm mt-1">Add quiz slides earlier in the presentation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
