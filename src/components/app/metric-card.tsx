import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EvaluationMetric } from '@/lib/types';

interface MetricCardProps {
  metric: EvaluationMetric;
  index: number;
  metricsCount: number;
  onUpdate: (index: number, updates: Partial<EvaluationMetric>) => void;
  onRemove: (index: number) => void;
  showWeight?: boolean;
  showTooltips?: boolean;
}

export function MetricCard({
  metric,
  index,
  metricsCount,
  onUpdate,
  onRemove,
  showWeight = true,
  showTooltips = true,
}: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Metric {index + 1}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={metricsCount <= 1}
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
            onChange={(e) => onUpdate(index, { name: e.target.value })}
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
              onUpdate(index, updates);
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
          onChange={(e) => onUpdate(index, { description: e.target.value })}
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
              onChange={(e) => onUpdate(index, { scaleMin: parseInt(e.target.value) || 1 })}
              min={0}
              max={metric.scaleMax - 1}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Value</Label>
            <Input
              type="number"
              value={metric.scaleMax}
              onChange={(e) => onUpdate(index, { scaleMax: parseInt(e.target.value) || 10 })}
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
              onUpdate(index, {
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
            onCheckedChange={(checked) => onUpdate(index, { lowerIsBetter: checked })}
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
              onChange={(e) => onUpdate(index, { weight: parseFloat(e.target.value) || 1 })}
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
  );
}
