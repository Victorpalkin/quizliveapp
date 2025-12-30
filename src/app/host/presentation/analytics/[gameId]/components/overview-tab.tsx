'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Layers, TrendingUp, TrendingDown, Target, Star, MessageSquare, Vote, HelpCircle } from 'lucide-react';
import type { PresentationAnalytics, PresentationSlideType } from '@/lib/types';

interface OverviewTabProps {
  analytics: PresentationAnalytics;
}

// Icons for slide types
const SLIDE_TYPE_ICONS: Partial<Record<PresentationSlideType, typeof HelpCircle>> = {
  'quiz': HelpCircle,
  'poll': Vote,
  'thoughts-collect': MessageSquare,
  'rating-input': Star,
};

// Colors for slide types
const SLIDE_TYPE_COLORS: Partial<Record<PresentationSlideType, string>> = {
  'quiz': 'bg-purple-500',
  'poll': 'bg-teal-500',
  'thoughts-collect': 'bg-blue-500',
  'rating-input': 'bg-orange-500',
};

export function OverviewTab({ analytics }: OverviewTabProps) {
  const { summary, slideStats, slideTypeBreakdown, totalPlayers, totalSlides, interactiveSlides } = analytics;

  // Get slides for most/least engaged
  const mostEngagedSlide = summary.mostEngagedSlide
    ? slideStats[summary.mostEngagedSlide.index]
    : null;
  const leastEngagedSlide = summary.leastEngagedSlide
    ? slideStats[summary.leastEngagedSlide.index]
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-pink-500" />}
          label="Players"
          value={totalPlayers}
        />
        <StatCard
          icon={<Layers className="h-5 w-5 text-purple-500" />}
          label="Interactive Slides"
          value={`${interactiveSlides}/${totalSlides}`}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-green-500" />}
          label="Avg Response Rate"
          value={`${summary.avgResponseRate.toFixed(1)}%`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          label="Avg Engagement"
          value={`${summary.avgEngagementScore.toFixed(1)}%`}
        />
      </div>

      {/* Additional Stats (if available) */}
      {(summary.avgQuizAccuracy !== undefined || summary.avgRating !== undefined) && (
        <div className="grid grid-cols-2 gap-4">
          {summary.avgQuizAccuracy !== undefined && (
            <StatCard
              icon={<HelpCircle className="h-5 w-5 text-purple-500" />}
              label="Avg Quiz Accuracy"
              value={`${summary.avgQuizAccuracy.toFixed(1)}%`}
            />
          )}
          {summary.avgRating !== undefined && (
            <StatCard
              icon={<Star className="h-5 w-5 text-orange-500" />}
              label="Avg Rating"
              value={summary.avgRating.toFixed(1)}
            />
          )}
        </div>
      )}

      {/* Slide Type Breakdown */}
      {slideTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Rate by Activity Type</CardTitle>
            <CardDescription>How players engaged with different slide types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slideTypeBreakdown.map((stat) => {
                const Icon = SLIDE_TYPE_ICONS[stat.type] || Layers;
                const colorClass = SLIDE_TYPE_COLORS[stat.type] || 'bg-gray-500';

                return (
                  <div key={stat.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{stat.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stat.count} slide{stat.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <span className="font-medium">{stat.avgResponseRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded overflow-hidden">
                      <div
                        className={`h-full ${colorClass} transition-all`}
                        style={{ width: `${Math.min(stat.avgResponseRate, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most/Least Engaged Slides */}
      <div className="grid md:grid-cols-2 gap-4">
        {mostEngagedSlide && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Most Engaged Slide
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {formatSlideType(mostEngagedSlide.slideType)}
                </Badge>
                <span className="truncate">
                  {mostEngagedSlide.title?.slice(0, 50) || `Slide ${mostEngagedSlide.slideIndex + 1}`}
                  {(mostEngagedSlide.title?.length || 0) > 50 ? '...' : ''}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.mostEngagedSlide!.responseRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {summary.mostEngagedSlide!.responseRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {leastEngagedSlide && leastEngagedSlide.slideIndex !== mostEngagedSlide?.slideIndex && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Least Engaged Slide
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {formatSlideType(leastEngagedSlide.slideType)}
                </Badge>
                <span className="truncate">
                  {leastEngagedSlide.title?.slice(0, 50) || `Slide ${leastEngagedSlide.slideIndex + 1}`}
                  {(leastEngagedSlide.title?.length || 0) > 50 ? '...' : ''}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.leastEngagedSlide!.responseRate} className="flex-1" />
                <span className="text-sm font-medium w-16 text-right">
                  {summary.leastEngagedSlide!.responseRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Participation Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Engagement</CardTitle>
          <CardDescription>
            Average response rate across all {interactiveSlides} interactive slides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={summary.avgEngagementScore} className="flex-1 h-4" />
            <span className="text-lg font-bold w-20 text-right">
              {summary.avgEngagementScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} participated across {interactiveSlides} interactive slide{interactiveSlides !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
