'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Users } from 'lucide-react';
import type { PresentationStyle } from '@/lib/types';

interface PresentationSettingsPanelProps {
  description: string;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  interactiveSlideCount: number;
  slideCount: number;
  defaultPacingMode: 'none' | 'threshold' | 'all';
  onDefaultPacingModeChange: (value: string) => void;
  defaultPacingThreshold: number;
  onDefaultPacingThresholdChange: (value: number[]) => void;
  style: PresentationStyle;
  onStyleChange: (key: keyof PresentationStyle, value: string) => void;
}

export function PresentationSettingsPanel({
  description,
  onDescriptionChange,
  interactiveSlideCount,
  slideCount,
  defaultPacingMode,
  onDefaultPacingModeChange,
  defaultPacingThreshold,
  onDefaultPacingThresholdChange,
  style,
  onStyleChange,
}: PresentationSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={onDescriptionChange}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      {/* Audience Pacing Settings */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Audience Pacing</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Control when you can advance past interactive slides
          {interactiveSlideCount > 0 && (
            <span className="font-medium"> ({interactiveSlideCount} interactive slide{interactiveSlideCount !== 1 ? 's' : ''})</span>
          )}
        </p>

        <div className="space-y-2">
          <Label className="text-xs">Default Pacing Mode</Label>
          <Select
            value={defaultPacingMode}
            onValueChange={onDefaultPacingModeChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex flex-col items-start">
                  <span>No requirement</span>
                  <span className="text-xs text-muted-foreground">Advance anytime</span>
                </div>
              </SelectItem>
              <SelectItem value="threshold">
                <div className="flex flex-col items-start">
                  <span>Wait for percentage</span>
                  <span className="text-xs text-muted-foreground">Wait for X% to respond</span>
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex flex-col items-start">
                  <span>Wait for all</span>
                  <span className="text-xs text-muted-foreground">Wait for 100% response</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {defaultPacingMode === 'threshold' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Response Threshold</Label>
              <span className="text-sm font-medium">{defaultPacingThreshold}%</span>
            </div>
            <Slider
              value={[defaultPacingThreshold]}
              onValueChange={onDefaultPacingThresholdChange}
              min={10}
              max={100}
              step={5}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              You can advance when {defaultPacingThreshold}% of players have responded
            </p>
          </div>
        )}
      </div>

      {/* Presentation Style Settings */}
      <Accordion type="single" collapsible className="border-t pt-4">
        <AccordionItem value="style" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Presentation Style
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Image Style</Label>
              <Textarea
                value={style?.imageStyle || ''}
                onChange={(e) => onStyleChange('imageStyle', e.target.value)}
                placeholder="Modern flat illustration, soft gradients, pastel colors..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Header Template</Label>
              <Input
                value={style?.headerTemplate || ''}
                onChange={(e) => onStyleChange('headerTemplate', e.target.value)}
                placeholder="Workshop: {title}"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Footer Template</Label>
              <Input
                value={style?.footerTemplate || ''}
                onChange={(e) => onStyleChange('footerTemplate', e.target.value)}
                placeholder="Company Name | 2024"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Font Style</Label>
              <Input
                value={style?.fontStyle || ''}
                onChange={(e) => onStyleChange('fontStyle', e.target.value)}
                placeholder="Clean sans-serif, bold headings"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Layout Hints</Label>
              <Input
                value={style?.layoutHints || ''}
                onChange={(e) => onStyleChange('layoutHints', e.target.value)}
                placeholder="Centered titles, generous whitespace"
                className="text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              These settings guide AI when generating slides and images
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="text-sm text-muted-foreground pt-2 border-t">
        {slideCount} slide{slideCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
