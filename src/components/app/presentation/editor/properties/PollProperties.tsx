'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Link2 } from 'lucide-react';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface PollPropertiesProps {
  element: SlideElement;
  slides?: PresentationSlide[];
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function PollProperties({ element, slides, onUpdate }: PollPropertiesProps) {
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

      {/* Dynamic Options Source (AI Step) */}
      {slides && (() => {
        const currentSlide = slides.find((s) => s.elements.some((el) => el.id === element.id));
        const currentOrder = currentSlide?.order ?? Infinity;

        const aiStepElements: { slideId: string; slideIndex: number; el: SlideElement }[] = [];
        slides.forEach((s, idx) => {
          if (s.order >= currentOrder) return;
          s.elements.forEach((el) => {
            if (el.type === 'ai-step' && el.aiStepConfig?.enableStructuredExtraction) {
              aiStepElements.push({ slideId: s.id, slideIndex: idx, el });
            }
          });
        });

        if (aiStepElements.length === 0) return null;

        const dynSrc = element.dynamicItemsSource;
        const selectedKey = dynSrc ? `${dynSrc.sourceSlideId}__${dynSrc.sourceElementId}` : '';

        const handleSourceChange = (key: string) => {
          if (!key || key === 'none') {
            onUpdate({ dynamicItemsSource: undefined });
            return;
          }
          const [slideId, elementId] = key.split('__');
          onUpdate({ dynamicItemsSource: { sourceSlideId: slideId, sourceElementId: elementId } });
        };

        return (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3.5 w-3.5 text-cyan-500" />
              <Label className="text-xs font-medium">Dynamic Options Source</Label>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Source options from an AI step with structured extraction. Overrides static options above during presentation.
            </p>
            <Select value={selectedKey} onValueChange={handleSourceChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="None (use static options)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (use static options)</SelectItem>
                {aiStepElements.map(({ slideId, slideIndex, el }) => {
                  const title = slides[slideIndex]?.elements.find((e) => e.type === 'text')?.content;
                  return (
                    <SelectItem
                      key={`${slideId}__${el.id}`}
                      value={`${slideId}__${el.id}`}
                    >
                      Slide {slideIndex + 1}{title ? `: ${title.slice(0, 40)}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {dynSrc && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs text-muted-foreground"
                onClick={() => onUpdate({ dynamicItemsSource: undefined })}
              >
                Clear source
              </Button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
