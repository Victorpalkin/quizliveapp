'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Wand2, Sparkles, Loader2, RefreshCw, Check } from 'lucide-react';
import { useStorage, useFunctions } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import type { SlideElement } from '@/lib/types';

interface ImagePropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
  presentationId?: string;
  slideId?: string;
}

export function ImageProperties({ element, onUpdate, presentationId, slideId }: ImagePropertiesProps) {
  const storage = useStorage();
  const functions = useFunctions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    const imageRef = ref(storage, `presentations/images/${nanoid()}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    onUpdate({ imageUrl: url });
  };

  const handleOpenAiDialog = () => {
    setPrompt('Create a professional, visually engaging image for a presentation slide.\n\nStyle: photorealistic, clean, modern.\nDo not include any text in the image.');
    setPreviewUrl(null);
    setAiDialogOpen(true);
  };

  const handleCloseAiDialog = async () => {
    if (previewUrl && storage) {
      try {
        const imageRef = ref(storage, previewUrl);
        await deleteObject(imageRef);
      } catch {
        // Preview cleanup is best-effort
      }
    }
    setPreviewUrl(null);
    setAiDialogOpen(false);
  };

  const handleGenerate = async () => {
    if (!functions || !prompt.trim()) return;

    if (previewUrl && storage) {
      try {
        const imageRef = ref(storage, previewUrl);
        await deleteObject(imageRef);
      } catch {
        // Previous preview cleanup is best-effort
      }
      setPreviewUrl(null);
    }

    setIsGenerating(true);
    try {
      const generateImage = httpsCallable<
        { prompt: string; presentationId?: string; slideId?: string },
        { imageUrl: string }
      >(functions, 'generateQuestionImage');

      const result = await generateImage({
        prompt: prompt.trim(),
        presentationId,
        slideId,
      });

      setPreviewUrl(result.data.imageUrl);
    } catch (error) {
      let errorMessage = 'Could not generate image. Please try again.';
      if (error instanceof Error) {
        const functionError = error as { code?: string; message?: string };
        if (functionError.code === 'unauthenticated') {
          errorMessage = 'You must be signed in to generate images.';
        } else if (functionError.code === 'resource-exhausted') {
          errorMessage = 'AI quota exceeded. Please try again later.';
        } else if (functionError.code === 'invalid-argument') {
          errorMessage = functionError.message || 'Invalid prompt. Please try a different one.';
        }
      }
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAiImage = () => {
    if (previewUrl) {
      onUpdate({ imageUrl: previewUrl });
      setPreviewUrl(null);
      setAiDialogOpen(false);
      toast({
        title: 'Image Added',
        description: 'AI-generated image has been applied.',
      });
    }
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
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {element.imageUrl ? 'Replace' : 'Upload'}
          </Button>
          {presentationId && slideId && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleOpenAiDialog}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          )}
        </div>
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

      {/* AI Image Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => !open && handleCloseAiDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Image with AI
            </DialogTitle>
            <DialogDescription>
              {previewUrl
                ? 'Review the generated image. Use it or regenerate with a different prompt.'
                : 'Describe the image you want and AI will generate it for your slide.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {previewUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={previewUrl}
                  alt="Generated preview"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ai-image-prompt">Image Prompt</Label>
              <Textarea
                id="ai-image-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want..."
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {previewUrl ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </Button>
                <Button onClick={handleConfirmAiImage} disabled={isGenerating}>
                  <Check className="mr-2 h-4 w-4" />
                  Use Image
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseAiDialog}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
