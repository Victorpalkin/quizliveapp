'use client';

import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Award } from 'lucide-react';
import { SlideEditorProps } from '../types';

type LeaderboardMode = 'standard' | 'podium';

const MODE_OPTIONS: { value: LeaderboardMode; label: string; description: string; icon: React.ReactNode; defaultMax: number }[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Simple list showing top players with scores and streaks',
    icon: <Trophy className="h-5 w-5" />,
    defaultMax: 10,
  },
  {
    value: 'podium',
    label: 'Podium',
    description: 'Final leaderboard with podium-style top 3 highlighting',
    icon: <Award className="h-5 w-5" />,
    defaultMax: 20,
  },
];

export function LeaderboardEditor({ slide, onSlideChange }: SlideEditorProps) {
  const mode = slide.leaderboardMode || 'standard';
  const maxDisplay = slide.leaderboardMaxDisplay || (mode === 'podium' ? 20 : 10);
  const title = slide.leaderboardTitle || '';

  const handleModeChange = useCallback((value: LeaderboardMode) => {
    const modeOption = MODE_OPTIONS.find(m => m.value === value);
    onSlideChange({
      ...slide,
      leaderboardMode: value,
      leaderboardMaxDisplay: modeOption?.defaultMax || 10,
    });
  }, [slide, onSlideChange]);

  const handleMaxDisplayChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
      onSlideChange({ ...slide, leaderboardMaxDisplay: num });
    }
  }, [slide, onSlideChange]);

  const handleTitleChange = useCallback((value: string) => {
    onSlideChange({ ...slide, leaderboardTitle: value || undefined });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Display Mode Selection */}
      <div className="space-y-2">
        <Label>Display Mode</Label>
        <div className="grid grid-cols-1 gap-2">
          {MODE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all ${
                mode === option.value
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleModeChange(option.value)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`${mode === option.value ? 'text-primary' : 'text-muted-foreground'}`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    mode === option.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Custom Title (optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={mode === 'podium' ? 'Final Results' : 'Leaderboard'}
        />
        <p className="text-sm text-muted-foreground">
          Leave empty to use the default title
        </p>
      </div>

      {/* Max Players to Display */}
      <div className="space-y-2">
        <Label htmlFor="maxDisplay">Players to Show</Label>
        <Input
          id="maxDisplay"
          type="number"
          min={1}
          max={100}
          value={maxDisplay}
          onChange={(e) => handleMaxDisplayChange(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          {mode === 'podium'
            ? 'Top 3 will be shown with podium styling'
            : 'Shows a simple ranked list'}
        </p>
      </div>
    </div>
  );
}
