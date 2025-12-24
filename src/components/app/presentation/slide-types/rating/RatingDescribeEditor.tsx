'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SlideEditorProps } from '../types';

export function RatingDescribeEditor({ slide, onSlideChange }: SlideEditorProps) {
  const ratingItem = slide.ratingItem || { title: '', description: '' };

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlideChange({
      ...slide,
      ratingItem: { ...ratingItem, title: e.target.value },
    });
  }, [slide, ratingItem, onSlideChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlideChange({
      ...slide,
      ratingItem: { ...ratingItem, description: e.target.value },
    });
  }, [slide, ratingItem, onSlideChange]);

  return (
    <div className="space-y-6">
      {/* Item Title */}
      <div className="space-y-2">
        <Label htmlFor="rating-title">Item Title</Label>
        <Input
          id="rating-title"
          value={ratingItem.title}
          onChange={handleTitleChange}
          placeholder="e.g., Feature A, Project X, Idea #1"
          className="text-lg"
        />
        <p className="text-sm text-muted-foreground">
          The name of the item participants will rate
        </p>
      </div>

      {/* Item Description */}
      <div className="space-y-2">
        <Label htmlFor="rating-description">Description (optional)</Label>
        <Textarea
          id="rating-description"
          value={ratingItem.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Explain what this item is about..."
          className="min-h-[100px]"
        />
        <p className="text-sm text-muted-foreground">
          Provide context to help participants make informed ratings
        </p>
      </div>
    </div>
  );
}
