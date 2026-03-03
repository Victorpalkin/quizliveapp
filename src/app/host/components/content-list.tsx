'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileQuestion, Cloud, BarChart3, Presentation, Vote, ArrowUpDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { CreateDropdown } from './create-dropdown';
import { QuizCard } from './quiz-card';
import { PollCard } from './poll-card';
import { ActivityCard } from './activity-card';
import { PresentationCard } from './presentation-card';
import { EmptyContentState } from './empty-content-state';
import type { Quiz, ThoughtsGatheringActivity, EvaluationActivity, PollActivity, Presentation as PresentationType } from '@/lib/types';

type Activity = ThoughtsGatheringActivity | EvaluationActivity | PollActivity;
type FilterType = 'all' | 'quiz' | 'thoughts-gathering' | 'evaluation' | 'presentation' | 'poll';
type SortType = 'recent' | 'alphabetical' | 'created';

type ContentItem = {
  type: 'quiz' | 'thoughts-gathering' | 'evaluation' | 'presentation' | 'poll';
  data: Quiz | Activity | PresentationType;
  title: string;
  updatedAt?: Date;
  createdAt?: Date;
};

interface ContentListProps {
  quizzes: Quiz[] | null;
  activities: Activity[];
  presentations: PresentationType[] | null;
  quizzesLoading: boolean;
  activitiesLoading: boolean;
  onHostGame: (quizId: string) => void;
  onPreviewQuiz: (quiz: Quiz) => void;
  onShareQuiz: (data: { id: string; title: string }) => void;
  onDeleteQuiz: (quizId: string) => void;
  onHostActivity: (activityId: string) => void;
  onPreviewPoll: (poll: PollActivity) => void;
  onSharePoll: (data: { id: string; title: string }) => void;
  onDeleteActivity: (activityId: string) => void;
  onHostPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentationId: string) => void;
}

export function ContentList({
  quizzes,
  activities,
  presentations,
  quizzesLoading,
  activitiesLoading,
  onHostGame,
  onPreviewQuiz,
  onShareQuiz,
  onDeleteQuiz,
  onHostActivity,
  onPreviewPoll,
  onSharePoll,
  onDeleteActivity,
  onHostPresentation,
  onDeletePresentation,
}: ContentListProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');

  const totalCount = (quizzes?.length || 0) + (activities?.length || 0) + (presentations?.length || 0);

  return (
    <div className="mb-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">My Content</h1>
          {!quizzesLoading && !activitiesLoading && totalCount > 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/host/create">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Explore Activity Types
            </Link>
          </Button>
          <CreateDropdown />
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mb-6">
        <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-muted p-1.5 rounded-xl w-full sm:w-auto">
          {[
            { value: 'all', label: 'All', icon: null },
            { value: 'quiz', label: 'Quizzes', icon: FileQuestion },
            { value: 'poll', label: 'Polls', icon: Vote },
            { value: 'presentation', label: 'Presentations', icon: Presentation },
            { value: 'thoughts-gathering', label: 'Thoughts', icon: Cloud },
            { value: 'evaluation', label: 'Evaluations', icon: BarChart3 },
          ].map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              onClick={() => setFilterType(value as FilterType)}
              className={`rounded-lg transition-all duration-200 justify-center ${
                filterType === value
                  ? 'bg-background shadow-sm text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {Icon && <Icon className={`h-4 w-4 mr-1.5 ${filterType === value ? 'text-primary' : ''}`} />}
              {label}
            </Button>
          ))}
        </div>

        <Select value={sortType} onValueChange={(value) => setSortType(value as SortType)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently edited</SelectItem>
            <SelectItem value="created">Recently created</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(quizzesLoading || activitiesLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-6">
                <div className="h-6 bg-muted rounded-lg w-3/4 animate-pulse"></div>
                <div className="h-4 bg-muted rounded-lg w-1/2 mt-2 animate-pulse"></div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="h-10 bg-muted rounded-lg w-full animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (() => {
        const allItems: ContentItem[] = [
          ...(quizzes?.map(q => ({
            type: 'quiz' as const,
            data: q,
            title: q.title,
            updatedAt: q.updatedAt,
            createdAt: q.createdAt,
          })) || []),
          ...(activities?.map(a => ({
            type: a.type,
            data: a,
            title: a.title,
            updatedAt: a.updatedAt,
            createdAt: a.createdAt,
          })) || []),
          ...(presentations?.map(p => ({
            type: 'presentation' as const,
            data: p,
            title: p.title,
            updatedAt: p.updatedAt,
            createdAt: p.createdAt,
          })) || []),
        ];

        const filteredItems = filterType === 'all'
          ? allItems
          : allItems.filter(item => item.type === filterType);

        const sortedItems = [...filteredItems].sort((a, b) => {
          const getDate = (item: ContentItem, field: 'updatedAt' | 'createdAt') => {
            const date = item[field];
            return date ? new Date(date).getTime() : 0;
          };

          switch (sortType) {
            case 'recent':
              return getDate(b, 'updatedAt') - getDate(a, 'updatedAt') || getDate(b, 'createdAt') - getDate(a, 'createdAt');
            case 'created':
              return getDate(b, 'createdAt') - getDate(a, 'createdAt');
            case 'alphabetical':
              return a.title.localeCompare(b.title);
            default:
              return 0;
          }
        });

        if (sortedItems.length === 0) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <EmptyContentState filterType={filterType} />
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedItems.map(item => {
              if (item.type === 'quiz') {
                const quiz = item.data as Quiz;
                return (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onHost={onHostGame}
                    onPreview={onPreviewQuiz}
                    onShare={onShareQuiz}
                    onDelete={onDeleteQuiz}
                  />
                );
              }
              if (item.type === 'poll') {
                const poll = item.data as PollActivity;
                return (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onHost={onHostActivity}
                    onPreview={onPreviewPoll}
                    onShare={onSharePoll}
                    onDelete={onDeleteActivity}
                  />
                );
              }
              if (item.type === 'presentation') {
                const pres = item.data as PresentationType;
                return (
                  <PresentationCard
                    key={pres.id}
                    presentation={pres}
                    onHost={onHostPresentation}
                    onDelete={onDeletePresentation}
                  />
                );
              }
              const activity = item.data as Activity;
              return (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onDelete={onDeleteActivity}
                />
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
