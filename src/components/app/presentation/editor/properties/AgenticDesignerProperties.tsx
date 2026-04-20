'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Switch } from '@/components/ui/switch';
import type { SlideElement } from '@/lib/types';

interface AgenticDesignerPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function AgenticDesignerProperties({ element, onUpdate }: AgenticDesignerPropertiesProps) {
  const config = element.agenticDesignerConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ agenticDesignerConfig: { ...config, ...updates } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Target Industry / Customer</Label>
        <Input
          value={config.target}
          onChange={(e) => updateConfig({ target: e.target.value })}
          placeholder="e.g., Global Retailer, Automotive OEM..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <ExpandableTextarea
          label="Description"
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value || undefined })}
          placeholder="Context for the audience..."
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Enable Audience Suggestions</Label>
        <Switch
          checked={config.enablePlayerNudges !== false}
          onCheckedChange={(checked) => updateConfig({ enablePlayerNudges: checked })}
        />
      </div>
    </div>
  );
}
