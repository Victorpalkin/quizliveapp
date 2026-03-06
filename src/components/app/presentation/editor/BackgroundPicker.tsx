'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { SlideBackground } from '@/lib/types';

interface BackgroundPickerProps {
  background?: SlideBackground;
  onChange: (bg: SlideBackground) => void;
}

const GRADIENT_PRESETS = [
  { label: 'Blue Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { label: 'Ocean', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { label: 'Forest', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { label: 'Warm', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { label: 'Cool', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { label: 'Dark', value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)' },
  { label: 'Monochrome', value: 'linear-gradient(135deg, #d7d2cc 0%, #304352 100%)' },
];

export function BackgroundPicker({ background, onChange }: BackgroundPickerProps) {
  const bg = background || { type: 'solid' as const, color: '#ffffff' };
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setIsUploading(true);
    try {
      const imageRef = ref(storage, `presentations/backgrounds/${nanoid()}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      onChange({ type: 'image', imageUrl: url });
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload background image.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Background</Label>
        <Select
          value={bg.type}
          onValueChange={(v) => {
            const type = v as SlideBackground['type'];
            if (type === 'solid') onChange({ type, color: bg.color || '#ffffff' });
            else if (type === 'gradient') onChange({ type, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' });
            else onChange({ type, imageUrl: bg.imageUrl || '' });
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Color</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bg.type === 'solid' && (
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={bg.color || '#ffffff'}
            onChange={(e) => onChange({ ...bg, color: e.target.value })}
            className="mt-1 h-9"
          />
        </div>
      )}

      {bg.type === 'gradient' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Presets</Label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onChange({ ...bg, gradient: preset.value })}
                  className={`h-8 rounded border transition-all ${
                    bg.gradient === preset.value
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:ring-1 hover:ring-muted-foreground/30'
                  }`}
                  style={{ background: preset.value }}
                  title={preset.label}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Custom CSS</Label>
            <Input
              value={bg.gradient || ''}
              onChange={(e) => onChange({ ...bg, gradient: e.target.value })}
              placeholder="linear-gradient(135deg, #667eea, #764ba2)"
              className="mt-1 text-xs"
            />
          </div>
          <div
            className="h-12 rounded border"
            style={{ background: bg.gradient || 'linear-gradient(135deg, #667eea, #764ba2)' }}
          />
        </div>
      )}

      {bg.type === 'image' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploading ? 'Uploading...' : bg.imageUrl ? 'Replace Image' : 'Upload Image'}
            </Button>
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={bg.imageUrl || ''}
              onChange={(e) => onChange({ ...bg, imageUrl: e.target.value })}
              placeholder="https://..."
              className="mt-1 text-xs"
            />
          </div>
          {bg.imageUrl && (
            <div
              className="h-20 rounded border bg-cover bg-center"
              style={{ backgroundImage: `url(${bg.imageUrl})` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
