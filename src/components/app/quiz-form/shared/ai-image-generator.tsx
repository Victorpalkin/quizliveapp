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

interface AIImageGeneratorProps {
  questionText: string;
  quizId?: string;
  tempId?: string;
  questionIndex: number;
  onImageGenerated: (imageUrl: string) => void;
}

/**
 * Generates a default prompt based on the question text
 * (neutral style, no cartoon reference)
 */
function generateDefaultPrompt(questionText: string): string {
  return `Create an engaging illustration for this quiz question: "${questionText}".

  Style photorealistic. Try to add something humorous.
Do not include any text in the image.`;
}

/**
 * Modal component for generating quiz question images with AI
 * Supports preview, regeneration, and confirmation flow
 */
export function AIImageGenerator({
  questionText,
  quizId,
  tempId,
  questionIndex,
  onImageGenerated,
}: AIImageGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const functions = useFunctions();
  const storage = useStorage();
  const { toast } = useToast();

  const handleOpen = () => {
    setPrompt(generateDefaultPrompt(questionText));
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
        { prompt: string; quizId?: string; tempId?: string; questionIndex: number },
        { imageUrl: string }
      >(functions, 'generateQuestionImage');

      const result = await generateImage({
        prompt: prompt.trim(),
        quizId,
        tempId,
        questionIndex,
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
        description: 'AI-generated image has been added to the question.',
      });
    }
  };

  // Don't render if neither quizId nor tempId is available
  if (!quizId && !tempId) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
        disabled={!questionText.trim()}
      >
        <Wand2 className="h-4 w-4" />
        AI
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
                : 'AI will generate an illustration for your question. Edit the prompt to customize.'}
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
