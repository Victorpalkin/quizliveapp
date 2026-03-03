'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SlideElement } from '@/lib/types';

interface QAPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function QAProperties({ element, onUpdate }: QAPropertiesProps) {
  const config = element.qaConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ qaConfig: { ...config, ...updates } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Topic (optional)</Label>
        <Input
          value={config.topic || ''}
          onChange={(e) => updateConfig({ topic: e.target.value })}
          placeholder="e.g. Today's presentation"
          className="mt-1"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Enable Moderation</Label>
        <Switch
          checked={config.moderationEnabled}
          onCheckedChange={(v) => updateConfig({ moderationEnabled: v })}
        />
      </div>
    </div>
  );
}
