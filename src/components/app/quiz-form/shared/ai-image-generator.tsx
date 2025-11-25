'use client';

import { useState } from 'react';
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
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
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
 */
function generateDefaultPrompt(questionText: string): string {
  return `Create a fun, colorful illustration for this quiz question: "${questionText}".
Make it humorous and engaging, suitable for a quiz game.
Style: cartoon-like, vibrant colors, playful.
Do not include any text in the image.`;
}

/**
 * Modal component for generating quiz question images with AI
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
  const functions = useFunctions();
  const { toast } = useToast();

  const handleOpen = () => {
    setPrompt(generateDefaultPrompt(questionText));
    setIsOpen(true);
  };

  const handleGenerate = async () => {
    if (!functions || !prompt.trim()) return;

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

      onImageGenerated(result.data.imageUrl);
      setIsOpen(false);
      toast({
        title: 'Image Generated!',
        description: 'AI image has been added to the question.',
      });
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Image with AI
            </DialogTitle>
            <DialogDescription>
              AI will generate a humorous illustration for your question.
              Edit the prompt below to customize the result.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Image Prompt</Label>
              <Textarea
                id="image-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want..."
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                The prompt is pre-filled based on your question. Feel free to edit it.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
