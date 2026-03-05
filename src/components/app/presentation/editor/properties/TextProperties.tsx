'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface TextPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Content</Label>
        <Textarea
          value={element.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={element.fontSize || 24}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            min={8}
            max={200}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={element.color || '#000000'}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Style</Label>
        <div className="flex gap-1 mt-1">
          <Button
            variant={element.fontWeight === 'bold' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={element.fontStyle === 'italic' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button
            variant={element.textAlign === 'left' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ textAlign: 'left' })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={element.textAlign === 'center' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ textAlign: 'center' })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={element.textAlign === 'right' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ textAlign: 'right' })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Font Family</Label>
        <Select
          value={element.fontFamily || 'inherit'}
          onValueChange={(v) => onUpdate({ fontFamily: v })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Default</SelectItem>
            <SelectItem value="Inter, sans-serif">Inter</SelectItem>
            <SelectItem value="Georgia, serif">Georgia</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
