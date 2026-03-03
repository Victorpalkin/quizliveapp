'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SlideElement } from '@/lib/types';

interface ThoughtsPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function ThoughtsProperties({ element, onUpdate }: ThoughtsPropertiesProps) {
  const config = element.thoughtsConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ thoughtsConfig: { ...config, ...updates } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Prompt</Label>
        <Textarea
          value={config.prompt}
          onChange={(e) => updateConfig({ prompt: e.target.value })}
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Max Per Player</Label>
          <Input
            type="number"
            value={config.maxPerPlayer}
            onChange={(e) => updateConfig({ maxPerPlayer: Number(e.target.value) })}
            min={1}
            max={10}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Time Limit (s)</Label>
          <Input
            type="number"
            value={config.timeLimit || 0}
            onChange={(e) => updateConfig({ timeLimit: Number(e.target.value) || undefined })}
            min={0}
            max={300}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
