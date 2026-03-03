'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface SpinWheelPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function SpinWheelProperties({ element, onUpdate }: SpinWheelPropertiesProps) {
  const config = element.spinWheelConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ spinWheelConfig: { ...config, ...updates } });
  };

  const updateSegment = (index: number, label: string) => {
    const newSegments = [...(config.segments || [])];
    newSegments[index] = { ...newSegments[index], label };
    updateConfig({ segments: newSegments });
  };

  const updateSegmentColor = (index: number, color: string) => {
    const newSegments = [...(config.segments || [])];
    newSegments[index] = { ...newSegments[index], color };
    updateConfig({ segments: newSegments });
  };

  const addSegment = () => {
    const segments = config.segments || [];
    if (segments.length >= 12) return;
    updateConfig({ segments: [...segments, { label: `Item ${segments.length + 1}` }] });
  };

  const removeSegment = (index: number) => {
    const segments = config.segments || [];
    if (segments.length <= 2) return;
    updateConfig({ segments: segments.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Mode</Label>
        <Select
          value={config.mode}
          onValueChange={(v) => updateConfig({ mode: v as 'players' | 'custom' })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="players">Players (auto-fill)</SelectItem>
            <SelectItem value="custom">Custom Segments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.mode === 'custom' && (
        <div>
          <Label className="text-xs">Segments</Label>
          <div className="mt-2 space-y-2">
            {(config.segments || []).map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="color"
                  value={seg.color || '#3b82f6'}
                  onChange={(e) => updateSegmentColor(i, e.target.value)}
                  className="w-9 h-8 p-0.5 flex-shrink-0"
                />
                <Input
                  value={seg.label}
                  onChange={(e) => updateSegment(i, e.target.value)}
                  className="flex-1 h-8"
                  placeholder={`Segment ${i + 1}`}
                />
                {(config.segments || []).length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSegment(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {(config.segments || []).length < 12 && (
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={addSegment}>
              <Plus className="h-3 w-3 mr-1" /> Add Segment
            </Button>
          )}
        </div>
      )}

      <div>
        <Label className="text-xs">Action (optional)</Label>
        <Input
          value={config.action || ''}
          onChange={(e) => updateConfig({ action: e.target.value })}
          placeholder="e.g. Answer the next question"
          className="mt-1"
        />
      </div>
    </div>
  );
}
