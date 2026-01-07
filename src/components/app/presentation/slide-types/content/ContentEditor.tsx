'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SlideEditorProps } from '../types';
import { SlideImageUpload } from '../../editor/SlideImageUpload';

export function ContentEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({ ...slide, title: e.target.value });
  }, [slide, onSlideChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange({ ...slide, description: e.target.value });
  }, [slide, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Image Section */}
      <SlideImageUpload
        imageUrl={slide.imageUrl}
        presentationId={presentation.id}
        slideId={slide.id}
        promptContext={slide.title || slide.description || 'presentation slide'}
        suggestedPrompt={slide.imagePrompt}
        onImageChange={(url) => onSlideChange({ ...slide, imageUrl: url })}
        label="Slide Image"
        imageStyle={presentation.style?.imageStyle}
      />

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
