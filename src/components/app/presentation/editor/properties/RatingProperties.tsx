'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface RatingPropertiesProps {
  element: SlideElement;
  slides?: PresentationSlide[];
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function RatingProperties({ element, slides, onUpdate }: RatingPropertiesProps) {
  const config = element.ratingConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ ratingConfig: { ...config, ...updates } });
  };

  const items = config.items ?? [];
  const isMultiItem = items.length > 0;

  // Item management
  const addItem = () => {
    if (!isMultiItem && config.itemTitle) {
      // Migrate legacy single-item to items array
      updateConfig({
        items: [
          { id: nanoid(), text: config.itemTitle, description: config.itemDescription },
          { id: nanoid(), text: `Item 2` },
        ],
      });
    } else {
      updateConfig({
        items: [...items, { id: nanoid(), text: `Item ${items.length + 1}` }],
      });
    }
  };

  const updateItem = (index: number, updates: Partial<(typeof items)[0]>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    updateConfig({ items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateConfig({ items: newItems });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Single-item fields (legacy mode) */}
      {!isMultiItem && (
        <>
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
        </>
      )}

      {/* Multi-item list */}
      {isMultiItem && (
        <div>
          <Label className="text-xs font-medium">Items to Rate</Label>
          <div className="mt-2 space-y-2">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    value={item.text}
                    onChange={(e) => updateItem(i, { text: e.target.value })}
                    className="h-8"
                    placeholder={`Item ${i + 1}`}
                  />
                  <Input
                    value={item.description || ''}
                    onChange={(e) => updateItem(i, { description: e.target.value || undefined })}
                    className="h-7 text-xs"
                    placeholder="Description (optional)"
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-0" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="h-3 w-3 mr-1" /> Add Item
      </Button>

      {/* Rating type */}
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

      {/* Min / Max */}
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

      {/* Question */}
      <div>
        <Label className="text-xs">Question (optional)</Label>
        <Input
          value={config.question || ''}
          onChange={(e) => updateConfig({ question: e.target.value })}
          placeholder="How would you rate this?"
          className="mt-1"
        />
      </div>

      {/* Dynamic Items Source */}
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
        const selectedKey = dynSrc
          ? `aistep__${dynSrc.sourceSlideId}__${dynSrc.sourceElementId}`
          : '';

        const handleSourceChange = (key: string) => {
          if (!key || key === 'none') {
            onUpdate({ dynamicItemsSource: undefined });
            return;
          }
          if (key.startsWith('aistep__')) {
            const [, slideId, elementId] = key.split('__');
            onUpdate({ dynamicItemsSource: { sourceSlideId: slideId, sourceElementId: elementId } });
          }
        };

        return (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3.5 w-3.5 text-cyan-500" />
              <Label className="text-xs font-medium">Dynamic Items Source</Label>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Source items from an AI step at runtime. Overrides static items during presentation. Only AI steps with structured extraction enabled appear here.
            </p>
            <Select value={selectedKey} onValueChange={handleSourceChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="None (use static items)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (use static items)</SelectItem>
                {aiStepElements.map(({ slideId, slideIndex, el: srcEl }) => {
                  const title = slides[slideIndex]?.elements.find((e) => e.type === 'text')?.content;
                  return (
                    <SelectItem
                      key={`aistep__${slideId}__${srcEl.id}`}
                      value={`aistep__${slideId}__${srcEl.id}`}
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
