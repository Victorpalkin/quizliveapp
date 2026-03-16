'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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
          <Button
            variant={element.textDecoration === 'underline' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}
          >
            <Underline className="h-4 w-4" />
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
            <SelectGroup>
              <SelectLabel>Sans-Serif</SelectLabel>
              <SelectItem value="inherit">Default</SelectItem>
              <SelectItem value="Inter, sans-serif">Inter</SelectItem>
              <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
              <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
              <SelectItem value="Lato, sans-serif">Lato</SelectItem>
              <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Serif</SelectLabel>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
              <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
              <SelectItem value="Merriweather, serif">Merriweather</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Monospace</SelectLabel>
              <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
              <SelectItem value="'Fira Code', monospace">Fira Code</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Display</SelectLabel>
              <SelectItem value="'Comic Neue', cursive">Comic Neue</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Line Height</Label>
          <span className="text-xs text-muted-foreground">{element.lineHeight || 1.4}</span>
        </div>
        <Slider
          value={[element.lineHeight || 1.4]}
          onValueChange={([v]) => onUpdate({ lineHeight: v })}
          min={0.8}
          max={3}
          step={0.1}
          className="mt-1"
        />
      </div>
    </div>
  );
}
