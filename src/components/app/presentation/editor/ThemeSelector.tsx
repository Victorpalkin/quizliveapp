'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import type { PresentationTheme } from '@/lib/types';

interface ThemeSelectorProps {
  theme: PresentationTheme;
  onUpdate: (updates: Partial<PresentationTheme>) => void;
}

const PRESETS: { value: PresentationTheme['preset']; label: string; primary: string; accent: string }[] = [
  { value: 'default', label: 'Default', primary: '#3b82f6', accent: '#8b5cf6' },
  { value: 'vibrant', label: 'Vibrant', primary: '#ef4444', accent: '#f97316' },
  { value: 'elegant', label: 'Elegant', primary: '#1e293b', accent: '#64748b' },
  { value: 'dark', label: 'Dark', primary: '#6366f1', accent: '#a855f7' },
  { value: 'playful', label: 'Playful', primary: '#ec4899', accent: '#06b6d4' },
];

export function ThemeSelector({ theme, onUpdate }: ThemeSelectorProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Palette className="h-4 w-4 mr-1.5" />
          Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Theme</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onUpdate({
                  preset: preset.value,
                  primaryColor: preset.primary,
                  accentColor: preset.accent,
                })}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${
                  theme.preset === preset.value
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-muted-foreground/20'
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                </div>
                <span className="text-xs">{preset.label}</span>
              </button>
            ))}
            <button
              onClick={() => onUpdate({ preset: 'custom' })}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${
                theme.preset === 'custom'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-blue-500" />
              </div>
              <span className="text-xs">Custom</span>
            </button>
          </div>

          {theme.preset === 'custom' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Primary</Label>
                  <Input
                    type="color"
                    value={theme.primaryColor || '#3b82f6'}
                    onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Accent</Label>
                  <Input
                    type="color"
                    value={theme.accentColor || '#8b5cf6'}
                    onChange={(e) => onUpdate({ accentColor: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Font Family</Label>
                <Input
                  value={theme.fontFamily || ''}
                  onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                  placeholder="Inter, sans-serif"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
