'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { SlideElement } from '@/lib/types';

interface ConnectorPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function ConnectorProperties({ element, onUpdate }: ConnectorPropertiesProps) {
  const config = element.connectorConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<NonNullable<SlideElement['connectorConfig']>>) => {
    onUpdate({
      connectorConfig: { ...config, ...updates },
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Routing</Label>
        <Select
          value={config.routingType}
          onValueChange={(v) => updateConfig({ routingType: v as 'straight' | 'elbow' | 'curved' })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">Straight</SelectItem>
            <SelectItem value="elbow">Elbow</SelectItem>
            <SelectItem value="curved">Curved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Stroke Color</Label>
        <Input
          type="color"
          value={config.strokeColor}
          onChange={(e) => updateConfig({ strokeColor: e.target.value })}
          className="mt-1 h-9"
        />
      </div>

      <div>
        <Label className="text-xs">Stroke Width</Label>
        <Slider
          value={[config.strokeWidth]}
          onValueChange={([v]) => updateConfig({ strokeWidth: v })}
          min={1}
          max={10}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-xs">Stroke Style</Label>
        <Select
          value={config.strokeStyle}
          onValueChange={(v) => updateConfig({ strokeStyle: v as 'solid' | 'dashed' | 'dotted' })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Start Arrow</Label>
          <Select
            value={config.startArrow}
            onValueChange={(v) => updateConfig({ startArrow: v as 'none' | 'arrow' })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="arrow">Arrow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">End Arrow</Label>
          <Select
            value={config.endArrow}
            onValueChange={(v) => updateConfig({ endArrow: v as 'none' | 'arrow' })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="arrow">Arrow</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attachment info */}
      {(config.startAttachment || config.endAttachment) && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Attachments</Label>
          {config.startAttachment && (
            <p className="text-xs text-muted-foreground mt-1">
              Start: attached to {config.startAttachment.anchor} anchor
            </p>
          )}
          {config.endAttachment && (
            <p className="text-xs text-muted-foreground mt-1">
              End: attached to {config.endAttachment.anchor} anchor
            </p>
          )}
        </div>
      )}
    </div>
  );
}
