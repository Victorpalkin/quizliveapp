'use client';

import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export function ContentEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({ ...slide, title: e.target.value });
  }, [slide, onSlideChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange({ ...slide, description: e.target.value });
  }, [slide, onSlideChange]);

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
      // Delete old image if exists and is a Firebase Storage URL
      if (slide.imageUrl?.includes('firebasestorage.googleapis.com')) {
        try {
          const oldImageRef = ref(storage, slide.imageUrl);
          await deleteObject(oldImageRef);
        } catch {
          // Ignore deletion errors (file may already be deleted)
        }
      }

      // Upload to Firebase Storage
      const storagePath = `presentations/${presentation.id}/slides/${slide.id}/image`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(imageRef);

      onSlideChange({ ...slide, imageUrl: downloadUrl });

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
  }, [slide, presentation.id, storage, onSlideChange, toast]);

  const handleRemoveImage = useCallback(async () => {
    if (!storage) return;

    // Delete from Firebase Storage if it's a Firebase URL
    if (slide.imageUrl?.includes('firebasestorage.googleapis.com')) {
      try {
        const imageRef = ref(storage, slide.imageUrl);
        await deleteObject(imageRef);
      } catch {
        // Ignore deletion errors
      }
    }

    onSlideChange({ ...slide, imageUrl: undefined });
  }, [slide, storage, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Image Section */}
      <div className="space-y-2">
        <Label>Slide Image</Label>
        {slide.imageUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
            <NextImage
              src={slide.imageUrl}
              alt="Slide content"
              fill
              className="object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Uploading image...
                  </p>
                </>
              ) : uploadError ? (
                <>
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-sm text-destructive mb-4">
                    {uploadError}
                  </p>
                  <Button
                    variant="outline"
                    className="relative"
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
                  <Image className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload an image for this slide
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={isUploading}
                      className="relative"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
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

      {/* Title Section */}
      <div className="space-y-2">
        <Label htmlFor="slide-title">Title (optional)</Label>
        <Input
          id="slide-title"
          value={slide.title || ''}
          onChange={handleTitleChange}
          placeholder="Slide title"
        />
      </div>

      {/* Description Section */}
      <div className="space-y-2">
        <Label htmlFor="slide-description">Description (optional)</Label>
        <Textarea
          id="slide-description"
          value={slide.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Add notes or description for this slide"
          rows={4}
        />
      </div>
    </div>
  );
}
