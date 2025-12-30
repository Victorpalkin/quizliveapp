'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Star, MessageSquare, HelpCircle, Vote, Layers } from 'lucide-react';
import type { PresentationAnalytics, PresentationSlideStats, PresentationSlideType, Presentation } from '@/lib/types';

interface SlidesTabProps {
  analytics: PresentationAnalytics;
  presentation?: Presentation | null;
}

// Slide types that we show in analytics
const INTERACTIVE_SLIDE_TYPES: PresentationSlideType[] = [
  'quiz',
  'poll',
  'thoughts-collect',
  'rating-input',
];

export function SlidesTab({ analytics, presentation }: SlidesTabProps) {
  const { slideStats, totalPlayers } = analytics;

  // Filter to only interactive slides
  const interactiveSlides = slideStats.filter(s =>
    INTERACTIVE_SLIDE_TYPES.includes(s.slideType)
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  if (interactiveSlides.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No interactive slides in this presentation</p>
        </CardContent>
      </Card>
    );
  }

  const currentSlide = interactiveSlides[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(interactiveSlides.length - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Slide {currentIndex + 1} of {interactiveSlides.length}
        </span>
        <Button
          variant="outline"
          onClick={goToNext}
          disabled={currentIndex === interactiveSlides.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Slide Card */}
      <SlideCard slide={currentSlide} totalPlayers={totalPlayers} />

      {/* Quick Navigation Pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {interactiveSlides.map((slide, idx) => (
          <Button
            key={slide.slideId}
            variant={idx === currentIndex ? 'default' : 'outline'}
            size="sm"
            className="min-w-10 h-10"
            onClick={() => setCurrentIndex(idx)}
            title={slide.title || `Slide ${slide.slideIndex + 1}`}
          >
            <SlideTypeIcon type={slide.slideType} className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}

function SlideCard({ slide, totalPlayers }: { slide: PresentationSlideStats; totalPlayers: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <SlideTypeIcon type={slide.slideType} className="h-5 w-5" />
              {slide.title || `Slide ${slide.slideIndex + 1}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{formatSlideType(slide.slideType)}</Badge>
              <span className="text-sm text-muted-foreground">
                Slide {slide.slideIndex + 1}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Responded" value={slide.totalResponded} total={totalPlayers} />
          <StatBox label="Response Rate" value={`${slide.responseRate.toFixed(1)}%`} />
          {slide.correctRate !== undefined && (
            <StatBox label="Correct" value={`${slide.correctRate.toFixed(1)}%`} />
          )}
          {slide.avgPoints !== undefined && (
            <StatBox label="Avg Points" value={Math.round(slide.avgPoints)} />
          )}
          {slide.avgRating !== undefined && (
            <StatBox label="Avg Rating" value={slide.avgRating.toFixed(1)} />
          )}
          {slide.submissionCount !== undefined && (
            <StatBox label="Submissions" value={slide.submissionCount} />
          )}
          {slide.topicsCount !== undefined && slide.topicsCount > 0 && (
            <StatBox label="Topics Found" value={slide.topicsCount} />
          )}
        </div>

        {/* Response Rate Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Response Rate</span>
            <span className="font-medium">{slide.responseRate.toFixed(1)}%</span>
          </div>
          <Progress value={slide.responseRate} />
        </div>

        {/* Type-specific visualizations */}
        {slide.answerDistribution && (
          <AnswerDistribution
            distribution={slide.answerDistribution}
            totalResponded={slide.totalResponded}
            isQuiz={slide.slideType === 'quiz'}
          />
        )}

        {slide.pollDistribution && (
          <PollDistribution
            distribution={slide.pollDistribution}
          />
        )}

        {slide.ratingDistribution && (
          <RatingDistribution
            distribution={slide.ratingDistribution}
            avgRating={slide.avgRating}
          />
        )}

        {slide.slideType === 'thoughts-collect' && (
          <ThoughtsInfo
            submissionCount={slide.submissionCount || 0}
            topicsCount={slide.topicsCount || 0}
          />
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, total }: { label: string; value: number | string; total?: number }) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <p className="text-2xl font-bold">
        {value}
        {total !== undefined && typeof value === 'number' && (
          <span className="text-sm text-muted-foreground">/{total}</span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AnswerDistribution({
  distribution,
  totalResponded,
  isQuiz,
}: {
  distribution: NonNullable<PresentationSlideStats['answerDistribution']>;
  totalResponded: number;
  isQuiz: boolean;
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Answer Distribution</h4>
      {distribution.map((answer, idx) => {
        const percentage = totalResponded > 0 ? (answer.count / totalResponded) * 100 : 0;
        const barWidth = (answer.count / maxCount) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {isQuiz && (
                answer.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                )
              )}
              <span className={isQuiz && answer.isCorrect ? 'font-medium' : ''}>
                {answer.label}
              </span>
              <span className="ml-auto text-muted-foreground">
                {answer.count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isQuiz && answer.isCorrect ? 'bg-green-500' : 'bg-primary/50'
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PollDistribution({
  distribution,
}: {
  distribution: NonNullable<PresentationSlideStats['pollDistribution']>;
}) {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Poll Results</h4>
      {distribution.map((option, idx) => {
        const barWidth = (option.count / maxCount) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span>{option.label}</span>
              <span className="ml-auto text-muted-foreground">
                {option.count} ({option.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingDistribution({
  distribution,
  avgRating,
}: {
  distribution: number[];
  avgRating?: number;
}) {
  const maxCount = Math.max(...distribution, 1);
  const totalResponses = distribution.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Rating Distribution</h4>
        {avgRating !== undefined && (
          <div className="flex items-center gap-1 text-orange-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-1 h-24">
        {distribution.map((count, idx) => {
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;

          return (
            <div
              key={idx}
              className="flex-1 group relative flex flex-col items-center"
              title={`${idx + 1} star: ${count} (${percentage.toFixed(0)}%)`}
            >
              <div
                className="w-full bg-orange-500 rounded-t transition-all"
                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {distribution.map((_, idx) => (
          <span key={idx} className="flex-1 text-center">{idx + 1}</span>
        ))}
      </div>
    </div>
  );
}

function ThoughtsInfo({
  submissionCount,
  topicsCount,
}: {
  submissionCount: number;
  topicsCount: number;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Thoughts Collected</h4>
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <MessageSquare className="h-8 w-8 text-blue-500" />
        <div>
          <p className="text-2xl font-bold">{submissionCount}</p>
          <p className="text-sm text-muted-foreground">
            total submission{submissionCount !== 1 ? 's' : ''}
            {topicsCount > 0 && ` grouped into ${topicsCount} topic${topicsCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideTypeIcon({ type, className }: { type: PresentationSlideType; className?: string }) {
  switch (type) {
    case 'quiz':
      return <HelpCircle className={className} />;
    case 'poll':
      return <Vote className={className} />;
    case 'thoughts-collect':
      return <MessageSquare className={className} />;
    case 'rating-input':
      return <Star className={className} />;
    default:
      return <Layers className={className} />;
  }
}

function formatSlideType(type: PresentationSlideType): string {
  const typeMap: Record<PresentationSlideType, string> = {
    'content': 'Content',
    'quiz': 'Quiz',
    'poll': 'Poll',
    'quiz-results': 'Quiz Results',
    'poll-results': 'Poll Results',
    'thoughts-collect': 'Thoughts',
    'thoughts-results': 'Thoughts Results',
    'rating-describe': 'Rating',
    'rating-input': 'Rating',
    'rating-results': 'Rating Results',
    'rating-summary': 'Rating Summary',
    'leaderboard': 'Leaderboard',
  };
  return typeMap[type] || type;
}
