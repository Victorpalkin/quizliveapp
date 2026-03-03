'use client';

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Upload } from 'lucide-react';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { nanoid } from 'nanoid';
import type { SlideElement } from '@/lib/types';

interface ImagePropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function ImageProperties({ element, onUpdate }: ImagePropertiesProps) {
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    const imageRef = ref(storage, `presentations/images/${nanoid()}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    onUpdate({ imageUrl: url });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Image</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {element.imageUrl ? 'Replace Image' : 'Upload Image'}
        </Button>
      </div>

      <div>
        <Label className="text-xs">URL</Label>
        <Input
          value={element.imageUrl || ''}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="https://..."
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Fit</Label>
        <Select
          value={element.objectFit || 'cover'}
          onValueChange={(v) => onUpdate({ objectFit: v as SlideElement['objectFit'] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Border Radius</Label>
        <Slider
          value={[element.borderRadius || 0]}
          onValueChange={([v]) => onUpdate({ borderRadius: v })}
          min={0}
          max={50}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-xs">Opacity</Label>
        <Slider
          value={[element.opacity ?? 1]}
          onValueChange={([v]) => onUpdate({ opacity: v })}
          min={0}
          max={1}
          step={0.05}
          className="mt-2"
        />
      </div>
    </div>
  );
}
