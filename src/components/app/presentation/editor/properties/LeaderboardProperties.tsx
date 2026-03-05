'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SlideElement } from '@/lib/types';

interface LeaderboardPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function LeaderboardProperties({ element, onUpdate }: LeaderboardPropertiesProps) {
  const config = element.leaderboardConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ leaderboardConfig: { ...config, ...updates } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Max Players Displayed</Label>
        <Input
          type="number"
          value={config.maxDisplay}
          onChange={(e) => updateConfig({ maxDisplay: Number(e.target.value) })}
          min={3}
          max={50}
          className="mt-1"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Show Scores</Label>
        <Switch
          checked={config.showScores}
          onCheckedChange={(v) => updateConfig({ showScores: v })}
        />
      </div>
    </div>
  );
}
