'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlideEditorProps } from '../types';

const MAX_SUBMISSIONS_OPTIONS = [1, 2, 3, 5, 10];
const TIME_LIMITS = [
  { value: 0, label: 'No limit' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
];

export function ThoughtsCollectEditor({ slide, onSlideChange }: SlideEditorProps) {
  const thoughtsPrompt = slide.thoughtsPrompt || '';
  const thoughtsMaxPerPlayer = slide.thoughtsMaxPerPlayer || 3;
  const thoughtsTimeLimit = slide.thoughtsTimeLimit || 0;

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange({ ...slide, thoughtsPrompt: e.target.value });
  }, [slide, onSlideChange]);

  const handleMaxPerPlayerChange = useCallback((value: string) => {
    onSlideChange({ ...slide, thoughtsMaxPerPlayer: parseInt(value) });
  }, [slide, onSlideChange]);

  const handleTimeLimitChange = useCallback((value: string) => {
    onSlideChange({ ...slide, thoughtsTimeLimit: parseInt(value) });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="thoughts-prompt">Prompt</Label>
        <Textarea
          id="thoughts-prompt"
          value={thoughtsPrompt}
          onChange={handlePromptChange}
          placeholder="What challenges do you face in your daily work?"
          className="min-h-[100px] text-lg"
        />
        <p className="text-sm text-muted-foreground">
          Ask participants to share their thoughts, ideas, or experiences
        </p>
      </div>

      {/* Max submissions per player */}
      <div className="space-y-2">
        <Label>Submissions per participant</Label>
        <Select
          value={String(thoughtsMaxPerPlayer)}
          onValueChange={handleMaxPerPlayerChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAX_SUBMISSIONS_OPTIONS.map((num) => (
              <SelectItem key={num} value={String(num)}>
                {num} {num === 1 ? 'submission' : 'submissions'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time limit */}
      <div className="space-y-2">
        <Label>Time limit</Label>
        <Select
          value={String(thoughtsTimeLimit)}
          onValueChange={handleTimeLimitChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_LIMITS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
