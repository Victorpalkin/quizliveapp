'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Link } from 'lucide-react';
import { SlideEditorProps } from '../types';

export function ThoughtsResultsEditor({ slide, presentation }: SlideEditorProps) {
  const sourceSlideId = slide.sourceSlideId;

  // Find the linked collection slide
  const sourceSlide = presentation.slides.find((s) => s.id === sourceSlideId);
  const sourcePrompt = sourceSlide?.thoughtsPrompt || 'Unknown prompt';

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-900">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Results Visualization</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This slide displays collected thoughts from participants as a word cloud or grouped view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked source */}
      {sourceSlide && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link className="h-4 w-4" />
            <span>Linked to collection slide</span>
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="font-medium">{sourcePrompt}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!sourceSlide && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Warning: This results slide is not linked to a collection slide.
        </p>
      )}
    </div>
  );
}
