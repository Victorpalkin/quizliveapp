'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, Upload, X } from 'lucide-react';
import { SlideEditorProps } from '../types';
import NextImage from 'next/image';

export function ContentEditor({ slide, onSlideChange }: SlideEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({ ...slide, title: e.target.value });
  }, [slide, onSlideChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange({ ...slide, description: e.target.value });
  }, [slide, onSlideChange]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: Implement Firebase Storage upload
      // For now, create a local preview URL
      const previewUrl = URL.createObjectURL(file);
      onSlideChange({ ...slide, imageUrl: previewUrl });
    } finally {
      setIsUploading(false);
    }
  }, [slide, onSlideChange]);

  const handleRemoveImage = useCallback(() => {
    onSlideChange({ ...slide, imageUrl: undefined });
  }, [slide, onSlideChange]);

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
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload an image or import from Google Slides
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  className="relative"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </div>
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
