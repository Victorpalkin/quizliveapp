'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, ImageIcon, Loader2, Check, X, AlertCircle, Play, Square } from 'lucide-react';
import { PresentationSlide } from '@/lib/types';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

interface BatchImageGeneratorProps {
  presentationId: string;
  slides: PresentationSlide[];
  onSlideUpdate: (slideId: string, imageUrl: string) => void;
  imageStyle?: string; // Presentation-wide image style for consistent generation
}

type GenerationStatus = 'pending' | 'generating' | 'success' | 'error';

interface SlideGenerationState {
  slideId: string;
  slideTitle: string;
  imagePrompt: string;
  status: GenerationStatus;
  error?: string;
}

/**
 * Component that enables batch generation of AI images for slides with imagePrompt
 */
export function BatchImageGenerator({
  presentationId,
  slides,
  onSlideUpdate,
  imageStyle,
}: BatchImageGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [generationStates, setGenerationStates] = useState<SlideGenerationState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const functions = useFunctions();
  const { toast } = useToast();

  // Find slides that have imagePrompt but no imageUrl
  const slidesNeedingImages = useMemo(() => {
    return slides.filter(
      (slide) => slide.imagePrompt && !slide.imageUrl
    );
  }, [slides]);

  // Get slide title for display
  const getSlideTitle = useCallback((slide: PresentationSlide): string => {
    switch (slide.type) {
      case 'content':
        return slide.title || 'Content Slide';
      case 'quiz':
        return slide.question?.text?.slice(0, 40) || 'Quiz Question';
      case 'poll':
        const pollQ = slide.question as { text?: string } | undefined;
        return pollQ?.text?.slice(0, 40) || 'Poll Question';
      default:
        return `${slide.type} Slide`;
    }
  }, []);

  // Initialize generation states when opening dialog
  const handleOpen = useCallback(() => {
    const states: SlideGenerationState[] = slidesNeedingImages.map((slide) => ({
      slideId: slide.id,
      slideTitle: getSlideTitle(slide),
      imagePrompt: slide.imagePrompt!,
      status: 'pending',
    }));
    setGenerationStates(states);
    setCurrentIndex(0);
    setIsCancelled(false);
    setIsOpen(true);
  }, [slidesNeedingImages, getSlideTitle]);

  // Generate image for a single slide
  const generateImageForSlide = useCallback(
    async (slide: PresentationSlide): Promise<string> => {
      if (!functions) throw new Error('Functions not available');

      const generateImage = httpsCallable<
        { prompt: string; styleGuide?: string; presentationId: string; slideId: string },
        { imageUrl: string }
      >(functions, 'generateQuestionImage');

      const result = await generateImage({
        prompt: slide.imagePrompt!,
        styleGuide: imageStyle,
        presentationId,
        slideId: slide.id,
      });

      return result.data.imageUrl;
    },
    [functions, presentationId, imageStyle]
  );

  // Start batch generation
  const handleStartGeneration = useCallback(async () => {
    if (!functions) return;

    setIsGenerating(true);
    setIsCancelled(false);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < slidesNeedingImages.length; i++) {
      // Check if cancelled
      if (isCancelled) {
        break;
      }

      const slide = slidesNeedingImages[i];
      setCurrentIndex(i);

      // Update state to generating
      setGenerationStates((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'generating' } : s
        )
      );

      try {
        const imageUrl = await generateImageForSlide(slide);

        // Update state to success
        setGenerationStates((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: 'success' } : s
          )
        );

        // Notify parent
        onSlideUpdate(slide.id, imageUrl);
        successCount++;
      } catch (error) {
        console.error(`Failed to generate image for slide ${slide.id}:`, error);

        // Update state to error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setGenerationStates((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: 'error', error: errorMessage } : s
          )
        );
        errorCount++;
      }

      // Small delay between generations to respect rate limits
      if (i < slidesNeedingImages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsGenerating(false);
    setCurrentIndex(slidesNeedingImages.length);

    // Show summary toast
    if (successCount > 0 || errorCount > 0) {
      toast({
        title: 'Image Generation Complete',
        description: `Generated ${successCount} image${successCount !== 1 ? 's' : ''}${
          errorCount > 0 ? `, ${errorCount} failed` : ''
        }`,
        variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
      });
    }
  }, [functions, slidesNeedingImages, isCancelled, generateImageForSlide, onSlideUpdate, toast]);

  // Cancel generation
  const handleCancel = useCallback(() => {
    setIsCancelled(true);
  }, []);

  // Close dialog
  const handleClose = useCallback(() => {
    if (isGenerating) {
      setIsCancelled(true);
    }
    setIsOpen(false);
  }, [isGenerating]);

  // Calculate progress
  const progress = useMemo(() => {
    if (generationStates.length === 0) return 0;
    const completed = generationStates.filter(
      (s) => s.status === 'success' || s.status === 'error'
    ).length;
    return Math.round((completed / generationStates.length) * 100);
  }, [generationStates]);

  // Don't render if no slides need images
  if (slidesNeedingImages.length === 0) {
    return null;
  }

  return (
    <>
      {/* Banner/Button */}
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm">
          {slidesNeedingImages.length} slide{slidesNeedingImages.length !== 1 ? 's have' : ' has'} AI image prompts
        </span>
        <Button size="sm" variant="outline" onClick={handleOpen} className="ml-auto gap-2">
          <ImageIcon className="h-4 w-4" />
          Generate Images
        </Button>
      </div>

      {/* Generation Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate AI Images
            </DialogTitle>
            <DialogDescription>
              {isGenerating
                ? `Generating image ${currentIndex + 1} of ${generationStates.length}...`
                : `Generate images for ${generationStates.length} slide${
                    generationStates.length !== 1 ? 's' : ''
                  } with AI prompts`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}

          {/* Slide List */}
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-2">
              {generationStates.map((state, index) => (
                <div
                  key={state.slideId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    state.status === 'generating'
                      ? 'bg-primary/5 border-primary/20'
                      : state.status === 'success'
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                      : state.status === 'error'
                      ? 'bg-destructive/5 border-destructive/20'
                      : 'bg-muted/50'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {state.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {state.status === 'generating' && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {state.status === 'success' && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                    {state.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  {/* Slide Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {index + 1}. {state.slideTitle}
                    </p>
                    {state.error ? (
                      <p className="text-xs text-destructive truncate">{state.error}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">
                        {state.imagePrompt.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Estimated Time */}
          {!isGenerating && generationStates.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Estimated time: ~{Math.ceil(generationStates.length * 15)} seconds
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {isGenerating ? (
              <Button variant="destructive" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : progress === 100 ? (
              <Button onClick={handleClose}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleStartGeneration}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Generation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
