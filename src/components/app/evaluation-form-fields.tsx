'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormCard } from '@/components/app/form-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SettingToggle } from '@/components/app/setting-toggle';
import { MetricCard } from '@/components/app/metric-card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  GripVertical,
  ListPlus,
  Sparkles,
} from 'lucide-react';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import type { EvaluationMetric, PredefinedItem } from '@/lib/types';
import { EVALUATION_TEMPLATES, type EvaluationTemplate } from '@/lib/constants/evaluation-templates';
import { nanoid } from 'nanoid';

// ---- Shared constants ----

export const DEFAULT_METRIC = (): EvaluationMetric => ({
  id: nanoid(8),
  name: '',
  description: '',
  scaleType: 'stars',
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: [],
  weight: 1,
  lowerIsBetter: false,
});

// ---- Template Picker ----

interface TemplatePickerProps {
  onApply: (template: EvaluationTemplate) => void;
  currentMetrics?: EvaluationMetric[];
  prominent?: boolean;
}

export function EvaluationTemplatePicker({ onApply, currentMetrics, prominent }: TemplatePickerProps) {
  return (
    <Card className={`shadow-lg rounded-2xl ${prominent ? 'border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : 'border border-card-border bg-gradient-to-br from-primary/5 to-transparent'}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>{prominent ? 'Quick Start Templates' : 'Choose a Metric Template'}</CardTitle>
        </div>
        <CardDescription>
          {prominent
            ? 'Choose a template to pre-configure your metrics, or define your own below'
            : 'Select how participants will evaluate the items'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EVALUATION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onApply(template)}
              className={`flex items-start gap-3 p-3 rounded-lg border bg-background hover:border-primary/50 hover:bg-muted/50 transition-colors text-left ${
                currentMetrics && currentMetrics.length > 0 && currentMetrics[0].name === template.metrics[0].name
                  ? 'border-primary bg-primary/5'
                  : ''
              }`}
            >
              <div className="mt-0.5">{template.icon}</div>
              <div>
                <p className="font-medium">{template.name}</p>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="flex gap-1 mt-1">
                  {template.metrics.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Metrics Editor ----

interface MetricsEditorProps {
  metrics: EvaluationMetric[];
  onMetricsChange: (metrics: EvaluationMetric[]) => void;
  onError: (title: string, description: string) => void;
  showWeight?: boolean;
  showTooltips?: boolean;
}

export function EvaluationMetricsEditor({
  metrics,
  onMetricsChange,
  onError,
  showWeight = true,
  showTooltips = true,
}: MetricsEditorProps) {
  const addMetric = () => {
    if (metrics.length >= 5) {
      onError("Maximum metrics reached", "You can have up to 5 metrics per activity.");
      return;
    }
    onMetricsChange([...metrics, DEFAULT_METRIC()]);
  };

  const removeMetric = (index: number) => {
    if (metrics.length <= 1) {
      onError("At least one metric required", "You need at least one metric for evaluation.");
      return;
    }
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, updates: Partial<EvaluationMetric>) => {
    onMetricsChange(metrics.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  return (
    <FormCard
      title="Metrics"
      description={showWeight ? 'Define criteria for rating items (1-5 metrics)' : 'Customize your evaluation criteria'}
      headerExtra={
        <div className="flex items-center gap-2">
          {showTooltips && (
            <FeatureTooltip
              content="Metrics are the criteria participants use to rate items. For example, 'Impact' and 'Effort' for a prioritization exercise."
              icon="info"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addMetric}
            disabled={metrics.length >= 5}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Metric
          </Button>
        </div>
      }
    >
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            index={index}
            metricsCount={metrics.length}
            onUpdate={updateMetric}
            onRemove={removeMetric}
            showWeight={showWeight}
            showTooltips={showTooltips}
          />
        ))}
    </FormCard>
  );
}

// ---- Predefined Items Editor ----

interface PredefinedItemsEditorProps {
  items: PredefinedItem[];
  onItemsChange: (items: PredefinedItem[]) => void;
}

export function EvaluationPredefinedItemsEditor({ items, onItemsChange }: PredefinedItemsEditorProps) {
  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: PredefinedItem = {
      id: nanoid(8),
      text: newItemText.trim(),
    };
    if (newItemDescription.trim()) {
      newItem.description = newItemDescription.trim();
    }
    onItemsChange([...items, newItem]);
    setNewItemText('');
    setNewItemDescription('');
  };

  return (
    <FormCard
      title="Predefined Items"
      description="Add items that will be available for ranking (optional)"
      headerExtra={<Badge variant="outline">{items.length} items</Badge>}
    >
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newItemText">Item Name</Label>
            <Input
              id="newItemText"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="e.g., Feature A, Project X"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addItem()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newItemDesc">Description (optional)</Label>
            <Textarea
              id="newItemDesc"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Additional context for participants..."
              rows={2}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={!newItemText.trim()}
          >
            <ListPlus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-mono text-sm">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="font-medium">{item.text}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onItemsChange(items.filter(i => i.id !== item.id))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No items added yet. You can also add items during the session.
          </p>
        )}
    </FormCard>
  );
}

// ---- Participant Settings ----

interface ParticipantSettingsProps {
  allowParticipantItems: boolean;
  onAllowParticipantItemsChange: (value: boolean) => void;
  maxItemsPerParticipant: number;
  onMaxItemsPerParticipantChange: (value: number) => void;
  requireApproval: boolean;
  onRequireApprovalChange: (value: boolean) => void;
  showItemSubmitter: boolean;
  onShowItemSubmitterChange: (value: boolean) => void;
}

export function EvaluationParticipantSettings({
  allowParticipantItems,
  onAllowParticipantItemsChange,
  maxItemsPerParticipant,
  onMaxItemsPerParticipantChange,
  requireApproval,
  onRequireApprovalChange,
  showItemSubmitter,
  onShowItemSubmitterChange,
}: ParticipantSettingsProps) {
  return (
    <FormCard
      title="Participant Settings"
      description="Configure how participants can contribute"
    >
        <SettingToggle
          id="allowItems"
          label="Allow Participant Item Submissions"
          description="Let participants suggest items to be ranked"
          checked={allowParticipantItems}
          onCheckedChange={onAllowParticipantItemsChange}
        />

        {allowParticipantItems && (
          <>
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <Label htmlFor="maxItems">Max Items per Participant</Label>
              <Input
                id="maxItems"
                type="number"
                min={1}
                max={10}
                value={maxItemsPerParticipant}
                onChange={(e) => onMaxItemsPerParticipantChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-32"
              />
            </div>

            <SettingToggle
              id="requireApproval"
              label="Require Host Approval"
              description="Review participant items before adding to ranking"
              checked={requireApproval}
              onCheckedChange={onRequireApprovalChange}
            />

            <SettingToggle
              id="showSubmitter"
              label="Show Item Submitter"
              description="Display who submitted each item"
              checked={showItemSubmitter}
              onCheckedChange={onShowItemSubmitterChange}
            />
          </>
        )}
    </FormCard>
  );
}

