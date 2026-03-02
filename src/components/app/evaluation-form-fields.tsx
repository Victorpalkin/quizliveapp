'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Sparkles,
  Target,
  Scale,
  Vote,
} from 'lucide-react';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EvaluationMetric, PredefinedItem } from '@/lib/types';
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

export interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  metrics: Omit<EvaluationMetric, 'id'>[];
}

export const EVALUATION_TEMPLATES: EvaluationTemplate[] = [
  {
    id: 'impact-effort',
    name: 'Impact/Effort Matrix',
    description: 'Prioritize by impact vs. effort - great for project planning',
    icon: <Target className="h-5 w-5 text-green-500" />,
    metrics: [
      { name: 'Impact', description: 'How much value will this deliver?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
      { name: 'Effort', description: 'How much work is required?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: true },
    ],
  },
  {
    id: 'priority',
    name: 'Simple Priority',
    description: 'Single metric ranking by importance',
    icon: <BarChart3 className="h-5 w-5 text-orange-500" />,
    metrics: [
      { name: 'Priority', description: 'How important is this?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'feasibility',
    name: 'Importance + Feasibility',
    description: 'Balance desirability with practicality',
    icon: <Scale className="h-5 w-5 text-blue-500" />,
    metrics: [
      { name: 'Importance', description: 'How important is this to achieve?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1.5, lowerIsBetter: false },
      { name: 'Feasibility', description: 'How realistic is it to accomplish?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'voting',
    name: 'Dot Voting',
    description: 'Simple yes/no voting for quick decisions',
    icon: <Vote className="h-5 w-5 text-purple-500" />,
    metrics: [
      { name: 'Vote', description: 'Do you support this?', scaleType: 'labels', scaleMin: 1, scaleMax: 2, scaleLabels: ['No', 'Yes'], weight: 1, lowerIsBetter: false },
    ],
  },
];

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
    <Card className="shadow-lg rounded-2xl border border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>
                {showWeight ? 'Define criteria for rating items (1-5 metrics)' : 'Customize your evaluation criteria'}
              </CardDescription>
            </div>
            {showTooltips && (
              <FeatureTooltip
                content="Metrics are the criteria participants use to rate items. For example, 'Impact' and 'Effort' for a prioritization exercise."
                icon="info"
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addMetric}
            disabled={metrics.length >= 5}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Metric
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={metric.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Metric {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMetric(index)}
                disabled={metrics.length <= 1}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={metric.name}
                  onChange={(e) => updateMetric(index, { name: e.target.value })}
                  placeholder="e.g., Impact, Effort, Risk"
                />
              </div>

              <div className="space-y-2">
                <Label>Scale Type</Label>
                <Select
                  value={metric.scaleType}
                  onValueChange={(value: 'stars' | 'numeric' | 'labels') => {
                    const updates: Partial<EvaluationMetric> = { scaleType: value };
                    if (value === 'stars') {
                      updates.scaleMin = 1;
                      updates.scaleMax = 5;
                    } else if (value === 'numeric') {
                      updates.scaleMin = 1;
                      updates.scaleMax = 10;
                    }
                    updateMetric(index, updates);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stars">Stars (1-5)</SelectItem>
                    <SelectItem value="numeric">Numeric (1-10)</SelectItem>
                    <SelectItem value="labels">Custom Labels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={metric.description || ''}
                onChange={(e) => updateMetric(index, { description: e.target.value })}
                placeholder="Help text for participants"
              />
            </div>

            {metric.scaleType === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    value={metric.scaleMin}
                    onChange={(e) => updateMetric(index, { scaleMin: parseInt(e.target.value) || 1 })}
                    min={0}
                    max={metric.scaleMax - 1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={metric.scaleMax}
                    onChange={(e) => updateMetric(index, { scaleMax: parseInt(e.target.value) || 10 })}
                    min={metric.scaleMin + 1}
                    max={100}
                  />
                </div>
              </div>
            )}

            {metric.scaleType === 'labels' && (
              <div className="space-y-2">
                <Label>Labels (comma-separated)</Label>
                <Input
                  key={metric.id}
                  defaultValue={metric.scaleLabels?.join(', ') || ''}
                  onBlur={(e) => {
                    const labels = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
                    updateMetric(index, {
                      scaleLabels: labels,
                      scaleMin: 1,
                      scaleMax: Math.max(labels.length, 2)
                    });
                  }}
                  placeholder="Low, Medium, High"
                />
                <p className="text-xs text-muted-foreground">
                  Enter 2-10 labels separated by commas
                </p>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id={`lower-${metric.id}`}
                  checked={metric.lowerIsBetter}
                  onCheckedChange={(checked) => updateMetric(index, { lowerIsBetter: checked })}
                />
                <Label htmlFor={`lower-${metric.id}`} className="flex items-center gap-1">
                  {metric.lowerIsBetter ? (
                    <><ArrowDown className="h-3 w-3 text-green-500" /> Lower is better</>
                  ) : (
                    <><ArrowUp className="h-3 w-3 text-green-500" /> Higher is better</>
                  )}
                </Label>
                {showTooltips && (
                  <FeatureTooltip
                    content={metric.lowerIsBetter
                      ? "Items with lower scores will rank higher. Use for metrics like 'Effort' or 'Cost' where less is better."
                      : "Items with higher scores will rank higher. Use for metrics like 'Impact' or 'Value' where more is better."
                    }
                    icon="info"
                    iconSize={14}
                  />
                )}
              </div>

              {showWeight && (
                <div className="flex items-center gap-2">
                  <Label htmlFor={`weight-${metric.id}`}>Weight:</Label>
                  <Input
                    id={`weight-${metric.id}`}
                    type="number"
                    value={metric.weight}
                    onChange={(e) => updateMetric(index, { weight: parseFloat(e.target.value) || 1 })}
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="w-20"
                  />
                  {showTooltips && (
                    <FeatureTooltip
                      content="Weight determines how much this metric counts in the final ranking. Higher weight = more influence. Default is 1."
                      icon="info"
                      iconSize={14}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
    <Card className="shadow-lg rounded-2xl border border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Predefined Items</CardTitle>
            <CardDescription>
              Add items that will be available for ranking (optional)
            </CardDescription>
          </div>
          <Badge variant="outline">{items.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
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
    <Card className="shadow-lg rounded-2xl border border-card-border">
      <CardHeader>
        <CardTitle>Participant Settings</CardTitle>
        <CardDescription>
          Configure how participants can contribute
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="allowItems">Allow Participant Item Submissions</Label>
            <p className="text-sm text-muted-foreground">
              Let participants suggest items to be ranked
            </p>
          </div>
          <Switch
            id="allowItems"
            checked={allowParticipantItems}
            onCheckedChange={onAllowParticipantItemsChange}
          />
        </div>

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

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="requireApproval">Require Host Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Review participant items before adding to ranking
                </p>
              </div>
              <Switch
                id="requireApproval"
                checked={requireApproval}
                onCheckedChange={onRequireApprovalChange}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="showSubmitter">Show Item Submitter</Label>
                <p className="text-sm text-muted-foreground">
                  Display who submitted each item
                </p>
              </div>
              <Switch
                id="showSubmitter"
                checked={showItemSubmitter}
                onCheckedChange={onShowItemSubmitterChange}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

