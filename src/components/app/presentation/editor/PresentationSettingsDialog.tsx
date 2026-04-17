'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import type { PresentationSettings } from '@/lib/types';

interface PresentationSettingsDialogProps {
  settings: PresentationSettings;
  onUpdate: (updates: Partial<PresentationSettings>) => void;
  description?: string;
  onDescriptionChange?: (description: string) => void;
  hasAISteps?: boolean;
}

export function PresentationSettingsDialog({ settings, onUpdate, description, onDescriptionChange, hasAISteps }: PresentationSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-1.5" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Presentation Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {onDescriptionChange && (
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                value={description || ''}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Add a description for this presentation..."
                className="mt-1 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Live Reactions</Label>
              <p className="text-xs text-muted-foreground">Allow audience emoji reactions</p>
            </div>
            <Switch
              checked={settings.enableReactions}
              onCheckedChange={(v) => onUpdate({ enableReactions: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Q&A</Label>
              <p className="text-xs text-muted-foreground">Allow audience questions</p>
            </div>
            <Switch
              checked={settings.enableQA}
              onCheckedChange={(v) => onUpdate({ enableQA: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Streaks</Label>
              <p className="text-xs text-muted-foreground">Enable answer streak multipliers</p>
            </div>
            <Switch
              checked={settings.enableStreaks}
              onCheckedChange={(v) => onUpdate({ enableStreaks: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Sound Effects</Label>
              <p className="text-xs text-muted-foreground">Play sounds on events</p>
            </div>
            <Switch
              checked={settings.enableSoundEffects}
              onCheckedChange={(v) => onUpdate({ enableSoundEffects: v })}
            />
          </div>

          <div>
            <Label className="text-sm">Default Timer (seconds)</Label>
            <Input
              type="number"
              value={settings.defaultTimerSeconds}
              onChange={(e) => onUpdate({ defaultTimerSeconds: Number(e.target.value) })}
              min={5}
              max={120}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Pacing Mode</Label>
            <Select
              value={settings.pacingMode}
              onValueChange={(v) => onUpdate({ pacingMode: v as PresentationSettings['pacingMode'] })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (host controls)</SelectItem>
                <SelectItem value="threshold">Auto-advance at threshold</SelectItem>
                <SelectItem value="all">Wait for all responses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.pacingMode === 'threshold' && (
            <div>
              <Label className="text-sm">Threshold (%)</Label>
              <Input
                type="number"
                value={settings.pacingThreshold}
                onChange={(e) => onUpdate({ pacingThreshold: Number(e.target.value) })}
                min={10}
                max={100}
                className="mt-1"
              />
            </div>
          )}

          {hasAISteps && (
            <>
              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-medium">Workflow Settings</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared AI persona and context for all AI Steps
                </p>
              </div>
              <div>
                <Label className="text-sm">System Prompt</Label>
                <Textarea
                  value={settings.workflowConfig?.systemPrompt ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      workflowConfig: {
                        ...settings.workflowConfig,
                        systemPrompt: e.target.value,
                      },
                    })
                  }
                  rows={4}
                  placeholder="AI persona shared across all AI steps..."
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">Target / Subject</Label>
                <Input
                  value={settings.workflowConfig?.target ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      workflowConfig: {
                        ...settings.workflowConfig,
                        systemPrompt: settings.workflowConfig?.systemPrompt ?? '',
                        target: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="e.g., company name, topic..."
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
