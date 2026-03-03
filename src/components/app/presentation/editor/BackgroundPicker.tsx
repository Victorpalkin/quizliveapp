'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SlideBackground } from '@/lib/types';

interface BackgroundPickerProps {
  background?: SlideBackground;
  onChange: (bg: SlideBackground) => void;
}

export function BackgroundPicker({ background, onChange }: BackgroundPickerProps) {
  const bg = background || { type: 'solid' as const, color: '#ffffff' };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Background</Label>
        <Select
          value={bg.type}
          onValueChange={(v) => {
            const type = v as SlideBackground['type'];
            if (type === 'solid') onChange({ type, color: bg.color || '#ffffff' });
            else if (type === 'gradient') onChange({ type, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' });
            else onChange({ type, imageUrl: bg.imageUrl || '' });
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Color</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bg.type === 'solid' && (
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={bg.color || '#ffffff'}
            onChange={(e) => onChange({ ...bg, color: e.target.value })}
            className="mt-1 h-9"
          />
        </div>
      )}

      {bg.type === 'gradient' && (
        <div>
          <Label className="text-xs">Gradient CSS</Label>
          <Input
            value={bg.gradient || ''}
            onChange={(e) => onChange({ ...bg, gradient: e.target.value })}
            placeholder="linear-gradient(135deg, #667eea, #764ba2)"
            className="mt-1 text-xs"
          />
          <div
            className="mt-2 h-12 rounded border"
            style={{ background: bg.gradient || 'linear-gradient(135deg, #667eea, #764ba2)' }}
          />
        </div>
      )}

      {bg.type === 'image' && (
        <div>
          <Label className="text-xs">Image URL</Label>
          <Input
            value={bg.imageUrl || ''}
            onChange={(e) => onChange({ ...bg, imageUrl: e.target.value })}
            placeholder="https://..."
            className="mt-1 text-xs"
          />
        </div>
      )}
    </div>
  );
}
