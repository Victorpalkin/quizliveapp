'use client';

import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileQuestion,
  Vote,
  MessageSquare,
  Star,
  Trophy,
  BarChart3,
} from 'lucide-react';
import type { GeneratedPresentationSlide } from '@/lib/ai-presentation-converter';

const SLIDE_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' }> = {
  'content': { label: 'Content', icon: FileText, variant: 'secondary' },
  'quiz': { label: 'Quiz', icon: FileQuestion, variant: 'default' },
  'poll': { label: 'Poll', icon: Vote, variant: 'default' },
  'thoughts-collect': { label: 'Thoughts', icon: MessageSquare, variant: 'default' },
  'thoughts-results': { label: 'Results', icon: BarChart3, variant: 'outline' },
  'rating-describe': { label: 'Rating', icon: Star, variant: 'default' },
  'rating-input': { label: 'Rating', icon: Star, variant: 'default' },
  'rating-results': { label: 'Results', icon: BarChart3, variant: 'outline' },
  'quiz-results': { label: 'Results', icon: BarChart3, variant: 'outline' },
  'poll-results': { label: 'Results', icon: BarChart3, variant: 'outline' },
  'leaderboard': { label: 'Leaderboard', icon: Trophy, variant: 'default' },
};

function getSlideTitle(slide: GeneratedPresentationSlide): string {
  if (slide.title) return slide.title;
  if (slide.question?.text) return slide.question.text;
  if (slide.pollQuestion?.text) return slide.pollQuestion.text;
  if (slide.thoughtsPrompt) return slide.thoughtsPrompt;
  if (slide.ratingItem?.title) return slide.ratingItem.title;
  if (slide.ratingMetric?.question) return slide.ratingMetric.question;
  if (slide.resultsTitle) return slide.resultsTitle;
  if (slide.type === 'leaderboard') return 'Leaderboard';
  if (slide.type === 'thoughts-results') return 'Thoughts Results';
  if (slide.type === 'rating-results') return 'Rating Results';
  return 'Untitled Slide';
}

function getSlideDescription(slide: GeneratedPresentationSlide): string | undefined {
  if (slide.description) return slide.description;
  if (slide.ratingItem?.description) return slide.ratingItem.description;
  return undefined;
}

interface AISlidePreviewProps {
  slides: GeneratedPresentationSlide[];
}

export function AISlidePreview({ slides }: AISlidePreviewProps) {
  return (
    <div className="space-y-2">
      {slides.map((slide, index) => {
        const config = SLIDE_TYPE_CONFIG[slide.type] || SLIDE_TYPE_CONFIG['content'];
        const Icon = config.icon;
        const title = getSlideTitle(slide);
        const description = getSlideDescription(slide);

        return (
          <div
            key={slide.id || index}
            className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold shrink-0 mt-0.5">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-5 gap-1">
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm font-medium truncate">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
