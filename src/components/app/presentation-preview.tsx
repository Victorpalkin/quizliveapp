'use client';

import { Badge } from '@/components/ui/badge';
import {
  Presentation,
  MessageSquare,
  BarChart3,
  Star,
  Trophy,
  HelpCircle,
  ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import type { PresentationSlide, PresentationSlideType, Presentation as PresentationType } from '@/lib/types';

// Slide type icon mapping
const slideTypeIcons: Record<PresentationSlideType, React.ReactNode> = {
  'content': <Presentation className="h-4 w-4" />,
  'quiz': <HelpCircle className="h-4 w-4" />,
  'poll': <BarChart3 className="h-4 w-4" />,
  'quiz-results': <HelpCircle className="h-4 w-4" />,
  'poll-results': <BarChart3 className="h-4 w-4" />,
  'thoughts-collect': <MessageSquare className="h-4 w-4" />,
  'thoughts-results': <MessageSquare className="h-4 w-4" />,
  'rating-describe': <Star className="h-4 w-4" />,
  'rating-input': <Star className="h-4 w-4" />,
  'rating-results': <Star className="h-4 w-4" />,
  'rating-summary': <BarChart3 className="h-4 w-4" />,
  'leaderboard': <Trophy className="h-4 w-4" />,
};

// Slide type labels
const slideTypeLabels: Record<PresentationSlideType, string> = {
  'content': 'Content',
  'quiz': 'Quiz',
  'poll': 'Poll',
  'quiz-results': 'Quiz Results',
  'poll-results': 'Poll Results',
  'thoughts-collect': 'Thoughts',
  'thoughts-results': 'Word Cloud',
  'rating-describe': 'Rating Item',
  'rating-input': 'Rate',
  'rating-results': 'Rating Results',
  'rating-summary': 'Summary',
  'leaderboard': 'Leaderboard',
};

// Slide type colors
const slideTypeColors: Record<PresentationSlideType, string> = {
  'content': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'quiz': 'bg-green-500/10 text-green-600 border-green-200',
  'poll': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'quiz-results': 'bg-green-500/10 text-green-600 border-green-200',
  'poll-results': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'thoughts-collect': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'thoughts-results': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'rating-describe': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-input': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-results': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-summary': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'leaderboard': 'bg-pink-500/10 text-pink-600 border-pink-200',
};

interface SlidePreviewCardProps {
  slide: PresentationSlide;
  index: number;
  showImage?: boolean;
}

export function SlidePreviewCard({ slide, index, showImage = true }: SlidePreviewCardProps) {
  const getSlideContent = () => {
    switch (slide.type) {
      case 'content':
        return slide.title || slide.description?.slice(0, 50) + '...' || 'Untitled slide';
      case 'quiz':
        return slide.question?.text || 'Quiz question';
      case 'poll':
        // Poll stores question differently
        const pollQ = slide.question as { text?: string } | undefined;
        return pollQ?.text || 'Poll question';
      case 'thoughts-collect':
        return slide.thoughtsPrompt || 'Thoughts collection';
      case 'thoughts-results':
        return 'Word Cloud Results';
      case 'rating-describe':
        return slide.ratingItem?.title || 'Rating item';
      case 'rating-input':
        return slide.ratingMetric?.question || 'Rate this item';
      case 'rating-results':
        return `Rating Results (${slide.ratingResultsMode || 'single'})`;
      case 'leaderboard':
        return slide.leaderboardTitle || 'Leaderboard';
      default:
        return 'Slide';
    }
  };

  const getSlideDetails = () => {
    switch (slide.type) {
      case 'quiz':
        // Check if question has answers (single-choice, multiple-choice types)
        const quizQuestion = slide.question;
        const answers = quizQuestion && 'answers' in quizQuestion ? quizQuestion.answers : [];
        return `${answers.length} answers`;
      case 'poll':
        const pollAnswers = (slide.question as { answers?: { text: string }[] })?.answers || [];
        return `${pollAnswers.length} options`;
      case 'thoughts-collect':
        return `Max ${slide.thoughtsMaxPerPlayer || 3} per player`;
      case 'rating-input':
        const metric = slide.ratingMetric;
        return metric ? `${metric.type} (${metric.min}-${metric.max})` : '';
      case 'leaderboard':
        return `Top ${slide.leaderboardMaxDisplay || 10}`;
      default:
        return '';
    }
  };

  const hasImage = showImage && slide.type === 'content' && slide.imageUrl;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Thumbnail for content slides with images */}
      {hasImage && (
        <div className="flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-muted">
          <Image
            src={slide.imageUrl!}
            alt={`Slide ${index + 1}`}
            width={96}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`text-xs ${slideTypeColors[slide.type]}`}>
            {slideTypeIcons[slide.type]}
            <span className="ml-1">{slideTypeLabels[slide.type]}</span>
          </Badge>
          {slide.imagePrompt && (
            <Badge variant="secondary" className="text-xs gap-1" title={slide.imagePrompt}>
              <ImageIcon className="h-3 w-3" />
              <span>AI Image</span>
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium truncate">{getSlideContent()}</p>
        {getSlideDetails() && (
          <p className="text-xs text-muted-foreground mt-0.5">{getSlideDetails()}</p>
        )}
      </div>
    </div>
  );
}

interface PresentationPreviewProps {
  presentation: PresentationType;
}

export function PresentationPreview({ presentation }: PresentationPreviewProps) {
  const slideCount = presentation.slides?.length || 0;
  const interactiveSlideCount = presentation.slides?.filter((s) => s.type !== 'content').length || 0;

  return (
    <div className="space-y-6">
      {/* Presentation Header */}
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold">{presentation.title || 'Untitled Presentation'}</h2>
        {presentation.description && (
          <p className="text-lg text-muted-foreground">{presentation.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full">
            {slideCount} {slideCount === 1 ? 'Slide' : 'Slides'}
          </Badge>
          {interactiveSlideCount > 0 && (
            <Badge variant="outline" className="rounded-full">
              {interactiveSlideCount} Interactive
            </Badge>
          )}
        </div>
      </div>

      {/* Slides */}
      <div className="space-y-2">
        {presentation.slides?.map((slide, index) => (
          <SlidePreviewCard key={slide.id || index} slide={slide} index={index} />
        ))}
      </div>
    </div>
  );
}
