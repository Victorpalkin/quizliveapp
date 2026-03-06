'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { SlideElement } from '@/lib/types';

interface ShapePropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function ShapeProperties({ element, onUpdate }: ShapePropertiesProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Shape</Label>
        <Select
          value={element.shapeType || 'rectangle'}
          onValueChange={(v) => onUpdate({ shapeType: v as SlideElement['shapeType'] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rectangle">Rectangle</SelectItem>
            <SelectItem value="circle">Circle</SelectItem>
            <SelectItem value="rounded-rect">Rounded Rectangle</SelectItem>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="triangle">Triangle</SelectItem>
            <SelectItem value="arrow-right">Arrow</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fill</Label>
          <Input
            type="color"
            value={element.backgroundColor || '#e2e8f0'}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Border</Label>
          <Input
            type="color"
            value={element.borderColor || '#94a3b8'}
            onChange={(e) => onUpdate({ borderColor: e.target.value })}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Border Width</Label>
        <Slider
          value={[element.borderWidth ?? 2]}
          onValueChange={([v]) => onUpdate({ borderWidth: v })}
          min={0}
          max={10}
          step={1}
          className="mt-2"
        />
      </div>
    </div>
  );
}
