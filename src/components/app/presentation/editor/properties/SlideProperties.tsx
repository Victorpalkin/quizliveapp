'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackgroundPicker } from '../BackgroundPicker';
import type { PresentationSlide, SlideBackground } from '@/lib/types';

interface SlidePropertiesProps {
  slide: PresentationSlide;
  onUpdateBackground: (bg: SlideBackground) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateTransition: (transition: PresentationSlide['transition']) => void;
}

export function SlideProperties({ slide, onUpdateBackground, onUpdateNotes, onUpdateTransition }: SlidePropertiesProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="border-b pb-3">
        <h3 className="text-sm font-medium">Slide Properties</h3>
      </div>

      <BackgroundPicker
        background={slide.background}
        onChange={onUpdateBackground}
      />

      <div>
        <Label className="text-xs">Transition</Label>
        <Select
          value={slide.transition || 'none'}
          onValueChange={(v) => onUpdateTransition(v as PresentationSlide['transition'])}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Speaker Notes</Label>
        <Textarea
          value={slide.notes || ''}
          onChange={(e) => onUpdateNotes(e.target.value)}
          rows={4}
          placeholder="Add speaker notes..."
          className="mt-1 text-xs"
        />
      </div>
    </div>
  );
}
