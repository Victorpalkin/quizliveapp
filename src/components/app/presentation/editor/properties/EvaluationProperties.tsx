'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { EXTRACTABLE_STEPS } from '@/lib/types';
import { AGENTIC_DESIGNER_STEPS } from '@/lib/agentic-designer-steps';
import type { SlideElement, PresentationSlide } from '@/lib/types';

interface EvaluationPropertiesProps {
  element: SlideElement;
  slides?: PresentationSlide[];
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function EvaluationProperties({ element, slides, onUpdate }: EvaluationPropertiesProps) {
  const config = element.evaluationConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ evaluationConfig: { ...config, ...updates } });
  };

  // Item management
  const addItem = () => {
    updateConfig({
      items: [...config.items, { id: nanoid(), text: `Item ${config.items.length + 1}` }],
    });
  };

  const updateItem = (index: number, updates: Partial<(typeof config.items)[0]>) => {
    const newItems = [...config.items];
    newItems[index] = { ...newItems[index], ...updates };
    updateConfig({ items: newItems });
  };

  const removeItem = (index: number) => {
    if (config.items.length <= 1) return;
    updateConfig({ items: config.items.filter((_, i) => i !== index) });
  };

  // Metric management
  const addMetric = () => {
    updateConfig({
      metrics: [
        ...config.metrics,
        {
          id: nanoid(),
          name: `Metric ${config.metrics.length + 1}`,
          scaleType: 'stars' as const,
          scaleMin: 1,
          scaleMax: 5,
          weight: 1,
          lowerIsBetter: false,
        },
      ],
    });
  };

  const updateMetric = (index: number, updates: Partial<(typeof config.metrics)[0]>) => {
    const newMetrics = [...config.metrics];
    newMetrics[index] = { ...newMetrics[index], ...updates };
    updateConfig({ metrics: newMetrics });
  };

  const removeMetric = (index: number) => {
    if (config.metrics.length <= 1) return;
    updateConfig({ metrics: config.metrics.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-4 space-y-5">
      {/* Title */}
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          value={config.description || ''}
          onChange={(e) => updateConfig({ description: e.target.value || undefined })}
          className="mt-1"
          rows={2}
          placeholder="Optional description..."
        />
      </div>

      {/* Items */}
      <div>
        <Label className="text-xs font-medium">Items to Evaluate</Label>
        <div className="mt-2 space-y-2">
          {config.items.map((item, i) => (
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
              {config.items.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-0" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Add Item
        </Button>
      </div>

      {/* Metrics */}
      <div>
        <Label className="text-xs font-medium">Metrics</Label>
        <div className="mt-2 space-y-3">
          {config.metrics.map((metric, i) => (
            <div key={metric.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Input
                  value={metric.name}
                  onChange={(e) => updateMetric(i, { name: e.target.value })}
                  className="h-7 text-sm font-medium flex-1 mr-2"
                  placeholder="Metric name"
                />
                {config.metrics.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMetric(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={metric.description || ''}
                onChange={(e) => updateMetric(i, { description: e.target.value || undefined })}
                className="h-7 text-xs"
                placeholder="Description (optional)"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Scale</Label>
                  <Select
                    value={metric.scaleType}
                    onValueChange={(v) => updateMetric(i, { scaleType: v as 'stars' | 'numeric' | 'labels' })}
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stars">Stars</SelectItem>
                      <SelectItem value="numeric">Numeric</SelectItem>
                      <SelectItem value="labels">Labels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Min</Label>
                  <Input
                    type="number"
                    value={metric.scaleMin}
                    onChange={(e) => updateMetric(i, { scaleMin: Number(e.target.value) })}
                    className="h-7 text-xs mt-0.5"
                    min={0}
                    max={metric.scaleMax - 1}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Max</Label>
                  <Input
                    type="number"
                    value={metric.scaleMax}
                    onChange={(e) => updateMetric(i, { scaleMax: Number(e.target.value) })}
                    className="h-7 text-xs mt-0.5"
                    min={metric.scaleMin + 1}
                    max={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Weight</Label>
                  <Input
                    type="number"
                    value={metric.weight}
                    onChange={(e) => updateMetric(i, { weight: Number(e.target.value) })}
                    className="h-7 text-xs mt-0.5"
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <Switch
                    id={`lower-${metric.id}`}
                    checked={metric.lowerIsBetter}
                    onCheckedChange={(v) => updateMetric(i, { lowerIsBetter: v })}
                  />
                  <Label htmlFor={`lower-${metric.id}`} className="text-[10px]">Lower is better</Label>
                </div>
              </div>
              {metric.scaleType === 'labels' && (
                <div>
                  <Label className="text-[10px]">Labels (comma-separated)</Label>
                  <Input
                    value={(metric.scaleLabels || []).join(', ')}
                    onChange={(e) =>
                      updateMetric(i, {
                        scaleLabels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="h-7 text-xs mt-0.5"
                    placeholder="Low, Medium, High"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {config.metrics.length < 5 && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={addMetric}>
            <Plus className="h-3 w-3 mr-1" /> Add Metric
          </Button>
        )}
      </div>

      {/* Dynamic Items Source */}
      {slides && (() => {
        const currentSlide = slides.find((s) => s.elements.some((el) => el.id === element.id));
        const currentOrder = currentSlide?.order ?? Infinity;

        // Agentic designer sources
        const agenticElements: { slideId: string; slideIndex: number; el: SlideElement }[] = [];
        slides.forEach((s, idx) => {
          s.elements.forEach((el) => {
            if (el.type === 'agentic-designer') {
              agenticElements.push({ slideId: s.id, slideIndex: idx, el });
            }
          });
        });

        // AI step sources (prior slides with structured extraction)
        const aiStepElements: { slideId: string; slideIndex: number; el: SlideElement }[] = [];
        slides.forEach((s, idx) => {
          if (s.order >= currentOrder) return;
          s.elements.forEach((el) => {
            if (el.type === 'ai-step' && el.aiStepConfig?.enableStructuredExtraction) {
              aiStepElements.push({ slideId: s.id, slideIndex: idx, el });
            }
          });
        });

        if (agenticElements.length === 0 && aiStepElements.length === 0) return null;

        const ref = element.agenticSourceRef;
        const dynSrc = element.dynamicItemsSource;
        const selectedKey = dynSrc
          ? `aistep__${dynSrc.sourceSlideId}__${dynSrc.sourceElementId}`
          : ref
            ? `agentic__${ref.slideId}__${ref.elementId}__${ref.step}`
            : '';

        const handleSourceChange = (key: string) => {
          if (!key || key === 'none') {
            onUpdate({ agenticSourceRef: undefined, dynamicItemsSource: undefined });
            return;
          }
          if (key.startsWith('aistep__')) {
            const [, slideId, elementId] = key.split('__');
            onUpdate({
              dynamicItemsSource: { sourceSlideId: slideId, sourceElementId: elementId },
              agenticSourceRef: undefined,
            });
          } else if (key.startsWith('agentic__')) {
            const [, slideId, elementId, step] = key.split('__');
            onUpdate({
              agenticSourceRef: { slideId, elementId, step: Number(step) },
              dynamicItemsSource: undefined,
            });
          }
        };

        return (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3.5 w-3.5 text-cyan-500" />
              <Label className="text-xs font-medium">Dynamic Items Source</Label>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Source items from an AI step or Agentic Designer at runtime. Overrides static items above during presentation.
            </p>
            <Select value={selectedKey} onValueChange={handleSourceChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="None (use static items)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (use static items)</SelectItem>
                {aiStepElements.length > 0 && (
                  <>
                    <SelectItem value="" disabled className="text-[10px] font-semibold text-muted-foreground">
                      AI Steps
                    </SelectItem>
                    {aiStepElements.map(({ slideId, slideIndex, el }) => {
                      const title = slides[slideIndex]?.elements.find((e) => e.type === 'text')?.content;
                      return (
                        <SelectItem
                          key={`aistep__${slideId}__${el.id}`}
                          value={`aistep__${slideId}__${el.id}`}
                        >
                          Slide {slideIndex + 1}{title ? `: ${title.slice(0, 40)}` : ''}
                        </SelectItem>
                      );
                    })}
                  </>
                )}
                {agenticElements.length > 0 && (
                  <>
                    <SelectItem value="" disabled className="text-[10px] font-semibold text-muted-foreground">
                      Agentic Designer
                    </SelectItem>
                    {agenticElements.flatMap(({ slideId, slideIndex, el }) =>
                      EXTRACTABLE_STEPS.map((step) => {
                        const stepTitle = AGENTIC_DESIGNER_STEPS[step - 1]?.title || `Step ${step}`;
                        const target = el.agenticDesignerConfig?.target || '';
                        return (
                          <SelectItem
                            key={`agentic__${slideId}__${el.id}__${step}`}
                            value={`agentic__${slideId}__${el.id}__${step}`}
                          >
                            Slide {slideIndex + 1}: {target ? `${target} - ` : ''}{stepTitle}
                          </SelectItem>
                        );
                      })
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
            {(ref || dynSrc) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs text-muted-foreground"
                onClick={() => onUpdate({ agenticSourceRef: undefined, dynamicItemsSource: undefined })}
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
