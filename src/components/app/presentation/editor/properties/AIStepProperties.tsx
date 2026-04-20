'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExpandableTextarea } from './ExpandableTextarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import type { SlideElement, PresentationSlide, AIStepConfig, AIStepFieldConfig } from '@/lib/types';

interface AIStepPropertiesProps {
  element: SlideElement;
  slides: PresentationSlide[];
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function AIStepProperties({ element, slides, onUpdate }: AIStepPropertiesProps) {
  const config = element.aiStepConfig ?? {
    stepPrompt: '',
    enablePlayerNudges: true,
  };

  const [newHint, setNewHint] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const updateConfig = (updates: Partial<AIStepConfig>) => {
    onUpdate({ aiStepConfig: { ...config, ...updates } });
  };

  // Find the current slide's order
  const currentSlide = slides.find((sl) => sl.elements.some((el) => el.id === element.id));
  const currentSlideOrder = currentSlide?.order ?? Infinity;

  // Show ai-step and interactive slides that come BEFORE the current one
  const CONTEXT_SOURCE_TYPES = ['ai-step', 'evaluation', 'rating', 'poll', 'thoughts', 'quiz'];
  const contextSourceSlides = slides.filter(
    (s) =>
      s.elements.some((el) => CONTEXT_SOURCE_TYPES.includes(el.type)) &&
      s.order < currentSlideOrder
  );
  const aiStepSlides = contextSourceSlides.filter((s) =>
    s.elements.some((el) => el.type === 'ai-step')
  );
  const interactionSlides = contextSourceSlides.filter(
    (s) => !s.elements.some((el) => el.type === 'ai-step') &&
           s.elements.some((el) => ['evaluation', 'rating', 'poll', 'thoughts', 'quiz'].includes(el.type))
  );

  const selectedContextIds = config.contextSlideIds ?? [];

  const toggleContextSlide = (slideId: string) => {
    const next = selectedContextIds.includes(slideId)
      ? selectedContextIds.filter((id) => id !== slideId)
      : [...selectedContextIds, slideId];
    updateConfig({ contextSlideIds: next.length > 0 ? next : undefined });
  };

  // Add input field
  const addField = () => {
    if (!newFieldLabel.trim()) return;
    const id = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_');
    const fields = config.inputFields ?? [];
    const field: AIStepFieldConfig = {
      id,
      label: newFieldLabel.trim(),
      type: 'textarea',
    };
    updateConfig({ inputFields: [...fields, field] });
    setNewFieldLabel('');
  };

  const removeField = (fieldId: string) => {
    const fields = (config.inputFields ?? []).filter((f) => f.id !== fieldId);
    updateConfig({ inputFields: fields.length > 0 ? fields : undefined });
  };

  const updateField = (fieldId: string, updates: Partial<AIStepFieldConfig>) => {
    const fields = (config.inputFields ?? []).map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateConfig({ inputFields: fields });
  };

  // Add nudge hint
  const addHint = () => {
    if (!newHint.trim()) return;
    const hints = config.nudgeHints ?? [];
    updateConfig({ nudgeHints: [...hints, newHint.trim()] });
    setNewHint('');
  };

  const removeHint = (index: number) => {
    const hints = (config.nudgeHints ?? []).filter((_, i) => i !== index);
    updateConfig({ nudgeHints: hints.length > 0 ? hints : undefined });
  };

  return (
    <div className="p-4 space-y-5">
      {/* Step Prompt */}
      <div>
        <Label className="text-xs font-medium">Step Prompt</Label>
        <p className="text-[10px] text-muted-foreground mb-1">
          What should the AI generate for this slide?
        </p>
        <ExpandableTextarea
          label="Step Prompt"
          value={config.stepPrompt}
          onChange={(e) => updateConfig({ stepPrompt: e.target.value })}
          placeholder="Describe what the AI should analyze, research, or generate..."
          rows={4}
          className="mt-1 text-xs"
        />
      </div>

      {/* Output Expectation */}
      <div>
        <Label className="text-xs font-medium">Output Expectation</Label>
        <ExpandableTextarea
          label="Output Expectation"
          value={config.outputExpectation ?? ''}
          onChange={(e) =>
            updateConfig({ outputExpectation: e.target.value || undefined })
          }
          placeholder="Guidance shown to host about expected output..."
          rows={2}
          className="mt-1 text-xs"
        />
      </div>

      {/* AI Capabilities */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">AI Capabilities</Label>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Google Search grounding</Label>
          <Switch
            checked={config.enableGoogleSearch ?? false}
            onCheckedChange={(checked) =>
              updateConfig({ enableGoogleSearch: checked || undefined })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Image generation</Label>
          <Switch
            checked={config.enableImageGeneration ?? false}
            onCheckedChange={(checked) =>
              updateConfig({ enableImageGeneration: checked || undefined })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Structured extraction</Label>
          <Switch
            checked={config.enableStructuredExtraction ?? false}
            onCheckedChange={(checked) =>
              updateConfig({ enableStructuredExtraction: checked || undefined })
            }
          />
        </div>
        {config.enableStructuredExtraction && (
          <div>
            <Input
              value={config.extractionHint ?? ''}
              onChange={(e) =>
                updateConfig({ extractionHint: e.target.value || undefined })
              }
              placeholder="e.g., Extract strategy options as items"
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Host Input Fields */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Host Input Fields</Label>
        {(config.inputFields ?? []).map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1.5"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                className="h-6 text-xs border-0 bg-transparent px-0"
              />
            </div>
            <select
              value={field.type}
              onChange={(e) =>
                updateField(field.id, { type: e.target.value as 'text' | 'textarea' | 'checkbox' })
              }
              className="h-6 text-[10px] bg-transparent border rounded px-1"
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="checkbox">Checkbox</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => removeField(field.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            placeholder="Field label..."
            className="text-xs h-7"
            onKeyDown={(e) => e.key === 'Enter' && addField()}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={addField}
            disabled={!newFieldLabel.trim()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Audience Suggestions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Audience Suggestions</Label>
          <Switch
            checked={config.enablePlayerNudges !== false}
            onCheckedChange={(checked) => updateConfig({ enablePlayerNudges: checked })}
          />
        </div>
        {config.enablePlayerNudges !== false && (
          <>
            <Label className="text-[10px] text-muted-foreground">
              Suggestion chips shown to players
            </Label>
            <div className="flex flex-wrap gap-1">
              {(config.nudgeHints ?? []).map((hint, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] pr-1 gap-0.5"
                >
                  {hint.length > 30 ? hint.slice(0, 30) + '...' : hint}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3.5 w-3.5 ml-0.5"
                    onClick={() => removeHint(i)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder="Add suggestion chip..."
                className="text-xs h-7"
                onKeyDown={(e) => e.key === 'Enter' && addHint()}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={addHint}
                disabled={!newHint.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Context Selection */}
      {contextSourceSlides.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Context Sources</Label>
          <p className="text-[10px] text-muted-foreground">
            Select which previous slides feed into this AI step. All selected by default.
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {aiStepSlides.length > 0 && (
              <>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">AI Steps</p>
                {aiStepSlides.map((s) => {
                  const title =
                    s.elements.find((el) => el.type === 'text')?.content ||
                    `Slide ${s.order + 1}`;
                  const isSelected =
                    selectedContextIds.length === 0 || selectedContextIds.includes(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleContextSlide(s.id)}
                      />
                      <span className="text-[11px] truncate">
                        {s.order + 1}. {title}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            {interactionSlides.length > 0 && (
              <>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Interaction Results</p>
                {interactionSlides.map((s) => {
                  const interactiveEl = s.elements.find((el) =>
                    ['evaluation', 'rating', 'poll', 'thoughts', 'quiz'].includes(el.type)
                  );
                  const typeLabel = interactiveEl?.type
                    ? interactiveEl.type.charAt(0).toUpperCase() + interactiveEl.type.slice(1)
                    : '';
                  const title =
                    s.elements.find((el) => el.type === 'text')?.content ||
                    `Slide ${s.order + 1}`;
                  const isSelected =
                    selectedContextIds.length === 0 || selectedContextIds.includes(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleContextSlide(s.id)}
                      />
                      <span className="text-[11px] truncate">
                        {s.order + 1}. {title}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{typeLabel}</Badge>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
