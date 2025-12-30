'use client';

import { useCallback } from 'react';
import { motion, Reorder } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Image, HelpCircle, BarChart3, MessageSquare, Star, Trophy, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PresentationSlide, PresentationSlideType } from '@/lib/types';
import { getSlideType } from '../slide-types';

const SLIDE_TYPE_ICONS: Record<PresentationSlideType, React.ReactNode> = {
  'content': <Image className="h-4 w-4" />,
  'quiz': <HelpCircle className="h-4 w-4" />,
  'poll': <BarChart3 className="h-4 w-4" />,
  'quiz-results': <HelpCircle className="h-4 w-4" />,
  'poll-results': <BarChart3 className="h-4 w-4" />,
  'thoughts-collect': <MessageSquare className="h-4 w-4" />,
  'thoughts-results': <MessageSquare className="h-4 w-4" />,
  'rating-describe': <Star className="h-4 w-4" />,
  'rating-input': <Star className="h-4 w-4" />,
  'rating-results': <BarChart3 className="h-4 w-4" />,
  'rating-summary': <BarChart3 className="h-4 w-4" />,
  'leaderboard': <Trophy className="h-4 w-4" />,
};

interface SlideListProps {
  slides: PresentationSlide[];
  selectedSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onReorderSlides: (slides: PresentationSlide[]) => void;
  onDeleteSlide: (slideId: string) => void;
  onAddSlide: () => void;
}

export function SlideList({
  slides,
  selectedSlideId,
  onSelectSlide,
  onReorderSlides,
  onDeleteSlide,
  onAddSlide,
}: SlideListProps) {
  const handleReorder = useCallback(
    (reorderedSlides: PresentationSlide[]) => {
      // Update order property for each slide
      const updatedSlides = reorderedSlides.map((slide, index) => ({
        ...slide,
        order: index,
      }));
      onReorderSlides(updatedSlides);
    },
    [onReorderSlides]
  );

  // Check if a slide has missing dependencies
  const getSlideWarning = (slide: PresentationSlide): string | null => {
    // Quiz results without source slides selected
    if (slide.type === 'quiz-results') {
      const hasQuizSlides = slides.some(s => s.type === 'quiz' && s.order < slide.order);
      if (!hasQuizSlides) return 'No quiz slides to display results for';
      if (!slide.sourceSlideIds || slide.sourceSlideIds.length === 0) return 'No quiz slides selected';
    }

    // Poll results without source slides selected
    if (slide.type === 'poll-results') {
      const hasPollSlides = slides.some(s => s.type === 'poll' && s.order < slide.order);
      if (!hasPollSlides) return 'No poll slides to display results for';
      if (!slide.sourceSlideIds || slide.sourceSlideIds.length === 0) return 'No poll slides selected';
    }

    // Thoughts results without collect slide
    if (slide.type === 'thoughts-results') {
      if (!slide.sourceSlideId) return 'No thoughts-collect slide linked';
      const sourceExists = slides.some(s => s.id === slide.sourceSlideId);
      if (!sourceExists) return 'Linked thoughts-collect slide not found';
    }

    // Rating input without describe slide
    if (slide.type === 'rating-input') {
      if (!slide.sourceDescribeSlideId) return 'No rating-describe slide linked';
      const sourceExists = slides.some(s => s.id === slide.sourceDescribeSlideId);
      if (!sourceExists) return 'Linked rating-describe slide not found';
    }

    // Rating results without input slide
    if (slide.type === 'rating-results') {
      if (!slide.sourceSlideId) return 'No rating-input slide linked';
      const sourceExists = slides.some(s => s.id === slide.sourceSlideId);
      if (!sourceExists) return 'Linked rating-input slide not found';
    }

    return null;
  };

  const getSlideLabel = (slide: PresentationSlide, index: number): string => {
    const slideType = getSlideType(slide.type);
    if (slide.type === 'content') {
      return slide.title || `Slide ${index + 1}`;
    }
    if (slide.type === 'quiz' || slide.type === 'poll') {
      return slide.question?.text?.slice(0, 30) || slideType.label;
    }
    if (slide.type === 'thoughts-collect') {
      return slide.thoughtsPrompt?.slice(0, 30) || 'Thoughts';
    }
    if (slide.type === 'rating-describe') {
      return slide.ratingItem?.title?.slice(0, 30) || 'Rating';
    }
    return slideType.label;
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      <div className="p-3 border-b">
        <Button onClick={onAddSlide} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Slide
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <Reorder.Group
          axis="y"
          values={slides}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {slides.map((slide, index) => (
            <Reorder.Item
              key={slide.id}
              value={slide}
              className="cursor-grab active:cursor-grabbing"
            >
              <Card
                className={`p-2 transition-all ${
                  selectedSlideId === slide.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelectSlide(slide.id)}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                    {SLIDE_TYPE_ICONS[slide.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {index + 1}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {getSlideLabel(slide, index)}
                    </p>
                  </div>

                  {getSlideWarning(slide) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0 p-1">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-sm">{getSlideWarning(slide)}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(slide.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {slides.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No slides yet</p>
            <p className="text-xs">Click "Add Slide" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
