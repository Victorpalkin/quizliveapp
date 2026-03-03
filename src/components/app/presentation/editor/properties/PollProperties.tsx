'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PollPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function PollProperties({ element, onUpdate }: PollPropertiesProps) {
  const config = element.pollConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ pollConfig: { ...config, ...updates } });
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...config.options];
    newOptions[index] = { text };
    updateConfig({ options: newOptions });
  };

  const addOption = () => {
    if (config.options.length >= 8) return;
    updateConfig({ options: [...config.options, { text: `Option ${config.options.length + 1}` }] });
  };

  const removeOption = (index: number) => {
    if (config.options.length <= 2) return;
    updateConfig({ options: config.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Question</Label>
        <Input
          value={config.question}
          onChange={(e) => updateConfig({ question: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Options</Label>
        <div className="mt-2 space-y-2">
          {config.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt.text}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 h-8"
                placeholder={`Option ${i + 1}`}
              />
              {config.options.length > 2 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {config.options.length < 8 && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" /> Add Option
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Allow Multiple Selections</Label>
        <Switch
          checked={config.allowMultiple}
          onCheckedChange={(v) => updateConfig({ allowMultiple: v })}
        />
      </div>
    </div>
  );
}
