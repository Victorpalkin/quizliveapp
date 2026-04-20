'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SlideElement } from '@/lib/types';

interface RatingPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function RatingProperties({ element, onUpdate }: RatingPropertiesProps) {
  const config = element.ratingConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ ratingConfig: { ...config, ...updates } });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Item Title</Label>
        <Input
          value={config.itemTitle}
          onChange={(e) => updateConfig({ itemTitle: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <ExpandableTextarea
          label="Description"
          value={config.itemDescription || ''}
          onChange={(e) => updateConfig({ itemDescription: e.target.value })}
          rows={2}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Rating Type</Label>
        <Select
          value={config.metricType}
          onValueChange={(v) => updateConfig({ metricType: v as 'stars' | 'slider' | 'emoji' })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">Stars</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="emoji">Emoji</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Min</Label>
          <Input type="number" value={config.min} onChange={(e) => updateConfig({ min: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Max</Label>
          <Input type="number" value={config.max} onChange={(e) => updateConfig({ max: Number(e.target.value) })} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Question (optional)</Label>
        <Input
          value={config.question || ''}
          onChange={(e) => updateConfig({ question: e.target.value })}
          placeholder="How would you rate this?"
          className="mt-1"
        />
      </div>
    </div>
  );
}
