'use client';

import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, Upload, X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { AISlideImageGenerator } from './AISlideImageGenerator';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

interface SlideImageUploadProps {
  imageUrl?: string;
  presentationId: string;
  slideId: string;
  promptContext: string; // e.g., question text or slide title for AI generation
  suggestedPrompt?: string; // AI-suggested prompt from presentation generation
  onImageChange: (imageUrl: string | undefined) => void;
  label?: string;
  imageStyle?: string; // Presentation-wide image style for consistent generation
}

/**
 * Combined image upload component for presentation slides.
 * Supports manual upload and AI image generation.
 */
export function SlideImageUpload({
  imageUrl,
  presentationId,
  slideId,
  promptContext,
  suggestedPrompt,
  onImageChange,
  label = 'Image (optional)',
  imageStyle,
}: SlideImageUploadProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete old image from storage (if it's a Firebase URL)
  const deleteOldImage = useCallback(async (oldUrl: string) => {
    if (!storage || !oldUrl?.includes('firebasestorage.googleapis.com')) return;
    try {
      const imageRef = ref(storage, oldUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Failed to delete old image:', error);
    }
  }, [storage]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Image must be less than 5MB.',
      });
      return;
    }

    // Validate file type
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Only PNG, JPEG, GIF, and WebP images are allowed.',
      });
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Delete old image if exists
      if (imageUrl) {
        await deleteOldImage(imageUrl);
      }

      // Upload to Firebase Storage
      const storagePath = `presentations/${presentationId}/slides/${slideId}/image`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(imageRef);

      onImageChange(downloadUrl);

      toast({
        title: 'Image uploaded',
        description: 'Your image has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadError('Failed to upload image. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Could not upload the image. Please try again.',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }, [storage, presentationId, slideId, imageUrl, deleteOldImage, onImageChange, toast]);

  const handleRemoveImage = useCallback(async () => {
    if (!imageUrl) return;

    // Delete from Firebase Storage
    await deleteOldImage(imageUrl);

    onImageChange(undefined);
  }, [imageUrl, deleteOldImage, onImageChange]);

  const handleAIImageGenerated = useCallback(async (newImageUrl: string) => {
    // Delete old image if exists
    if (imageUrl) {
      await deleteOldImage(imageUrl);
    }
    onImageChange(newImageUrl);
  }, [imageUrl, deleteOldImage, onImageChange]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {imageUrl ? (
        <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
          <NextImage
            src={imageUrl}
            alt="Slide image"
            fill
            className="object-contain"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Uploading image...
                </p>
              </>
            ) : uploadError ? (
              <>
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="text-sm text-destructive mb-3">
                  {uploadError}
                </p>
                <Button
                  variant="outline"
                  className="relative"
                  type="button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Try Again
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </>
            ) : (
              <>
                <Image className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  Upload an image or generate with AI
                </p>
                {suggestedPrompt && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-full mb-3">
                    <Sparkles className="h-3 w-3" />
                    <span>AI prompt ready</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={isUploading}
                    className="relative"
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  <AISlideImageGenerator
                    promptContext={promptContext}
                    suggestedPrompt={suggestedPrompt}
                    presentationId={presentationId}
                    slideId={slideId}
                    onImageGenerated={handleAIImageGenerated}
                    imageStyle={imageStyle}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 5MB. PNG, JPEG, GIF, or WebP.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
