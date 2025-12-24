'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Wand2, Check, RefreshCw } from 'lucide-react';
import { useFunctions, useStorage } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

interface AISlideImageGeneratorProps {
  promptContext: string;
  suggestedPrompt?: string; // AI-suggested prompt from presentation generation
  presentationId: string;
  slideId: string;
  onImageGenerated: (imageUrl: string) => void;
}

/**
 * Generates a default prompt based on the slide context
 */
function generateDefaultPrompt(context: string): string {
  return `Create an engaging illustration for this presentation slide: "${context}".

Style photorealistic. Make it visually appealing and professional.
Do not include any text in the image.`;
}

/**
 * Modal component for generating presentation slide images with AI
 * Supports preview, regeneration, and confirmation flow
 */
export function AISlideImageGenerator({
  promptContext,
  suggestedPrompt,
  presentationId,
  slideId,
  onImageGenerated,
}: AISlideImageGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const functions = useFunctions();
  const storage = useStorage();
  const { toast } = useToast();

  const handleOpen = () => {
    // Use suggested prompt from AI if available, otherwise generate default
    setPrompt(suggestedPrompt || generateDefaultPrompt(promptContext));
    setPreviewUrl(null);
    setIsOpen(true);
  };

  const handleClose = async () => {
    // Delete temp preview image if not confirmed
    if (previewUrl && storage) {
      try {
        const imageRef = ref(storage, previewUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Failed to delete preview image:', error);
      }
    }
    setPreviewUrl(null);
    setIsOpen(false);
  };

  const handleGenerate = async () => {
    if (!functions || !prompt.trim()) return;

    // Delete previous preview image if regenerating
    if (previewUrl && storage) {
      try {
        const imageRef = ref(storage, previewUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Failed to delete previous preview:', error);
      }
      setPreviewUrl(null);
    }

    setIsGenerating(true);
    try {
      const generateImage = httpsCallable<
        { prompt: string; presentationId: string; slideId: string },
        { imageUrl: string }
      >(functions, 'generateQuestionImage');

      const result = await generateImage({
        prompt: prompt.trim(),
        presentationId,
        slideId,
      });

      // Show preview instead of immediately applying
      setPreviewUrl(result.data.imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);

      let errorMessage = 'Could not generate image. Please try again.';
      if (error instanceof Error) {
        const functionError = error as { code?: string; message?: string };
        if (functionError.code === 'unauthenticated') {
          errorMessage = 'You must be signed in to generate images.';
        } else if (functionError.code === 'resource-exhausted') {
          errorMessage = 'AI quota exceeded. Please try again later.';
        } else if (functionError.code === 'invalid-argument') {
          errorMessage =
            functionError.message || 'Invalid prompt. Please try a different one.';
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

  const handleConfirm = () => {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      setPreviewUrl(null);
      setIsOpen(false);
      toast({
        title: 'Image Added',
        description: 'AI-generated image has been added to the slide.',
      });
    }
  };

  // Don't render if presentationId or slideId is missing
  if (!presentationId || !slideId) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="gap-2"
        disabled={!promptContext.trim()}
      >
        <Wand2 className="h-4 w-4" />
        AI Generate
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Image with AI
            </DialogTitle>
            <DialogDescription>
              {previewUrl
                ? 'Review the generated image. Use it or regenerate with a different prompt.'
                : 'AI will generate an illustration for your slide. Edit the prompt to customize.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Preview */}
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

            {/* Prompt Editor */}
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Image Prompt</Label>
              <Textarea
                id="image-prompt"
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
                <Button onClick={handleConfirm} disabled={isGenerating}>
                  <Check className="mr-2 h-4 w-4" />
                  Use Image
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
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
    </>
  );
}
