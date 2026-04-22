'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileQuestion, Cloud, BarChart3, Presentation, Vote, ArrowUpDown, Sparkles, Search, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { CreateDropdown } from './create-dropdown';
import { ContentCard } from './content-card';
import { PresentationCard } from './presentation-card';
import { EmptyContentState } from './empty-content-state';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
import { exportActivity } from '@/lib/export-import';
import { formatRelativeTime } from '@/lib/utils/format-date';
import type { Quiz, ThoughtsGatheringActivity, EvaluationActivity, PollActivity, Presentation as PresentationType, ActivityType } from '@/lib/types';

type Activity = ThoughtsGatheringActivity | EvaluationActivity | PollActivity;
type FilterType = 'all' | ActivityType;
type SortType = 'recent' | 'alphabetical' | 'created';

type ContentItem = {
  type: ActivityType;
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
  onHostGame: (quizId: string) => void | Promise<void>;
  onPreviewQuiz: (quiz: Quiz) => void;
  onShareQuiz: (data: { id: string; title: string }) => void;
  onDeleteQuiz: (quizId: string) => void;
  onHostActivity: (activityId: string) => void | Promise<void>;
  onPreviewPoll: (poll: PollActivity) => void;
  onSharePoll: (data: { id: string; title: string }) => void;
  onDeleteActivity: (activityId: string) => void;
  onHostPresentation: (presentationId: string) => void | Promise<void>;
  onSharePresentation?: (data: { id: string; title: string }) => void;
  onDeletePresentation: (presentationId: string) => void;
  onImport?: () => void;
}

function getActivityDescription(item: ContentItem): string {
  const dateDisplay = formatRelativeTime(item.updatedAt || item.createdAt);
  const dateSuffix = dateDisplay ? ` \u00b7 ${dateDisplay}` : '';

  if (item.type === 'quiz') {
    const quiz = item.data as Quiz;
    return `${quiz.questions.length} questions${dateSuffix}`;
  }
  if (item.type === 'poll') {
    const poll = item.data as PollActivity;
    const count = poll.questions?.length || 0;
    return `${count} ${count === 1 ? 'question' : 'questions'}${dateSuffix}`;
  }
  if (item.type === 'evaluation') {
    const evaluation = item.data as EvaluationActivity;
    const count = evaluation.config.metrics?.length || 0;
    return `Evaluation \u00b7 ${count} metric${count !== 1 ? 's' : ''}${dateSuffix}`;
  }
  if (item.type === 'thoughts-gathering') {
    const tg = item.data as ThoughtsGatheringActivity;
    const prompt = tg.config.prompt;
    const summary = prompt
      ? prompt.length > 30 ? `"${prompt.substring(0, 30)}..."` : `"${prompt}"`
      : '';
    return `Thoughts Gathering${summary ? ` \u00b7 ${summary}` : ''}${dateSuffix}`;
  }

  return `${ACTIVITY_CONFIG[item.type].label}${dateSuffix}`;
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
  onSharePresentation,
  onDeletePresentation,
  onImport,
}: ContentListProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = (quizzes?.length || 0) + (activities?.length || 0) + (presentations?.length || 0);

  const sortedItems = useMemo(() => {
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

    const searchedItems = searchQuery
      ? allItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : allItems;

    const filteredItems = filterType === 'all'
      ? searchedItems
      : searchedItems.filter(item => item.type === filterType);

    return [...filteredItems].sort((a, b) => {
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
  }, [quizzes, activities, presentations, searchQuery, filterType, sortType]);

  const renderItem = (item: ContentItem) => {
    // Presentation cards have a unique layout (thumbnail, dropdown menu)
    if (item.type === 'presentation') {
      const pres = item.data as PresentationType;
      return (
        <PresentationCard
          key={pres.id}
          presentation={pres}
          onHost={onHostPresentation}
          onShare={onSharePresentation ? (p) => onSharePresentation(p) : undefined}
          onExport={(p) => exportActivity('presentation', p.title, p as unknown as Record<string, unknown>)}
          onDelete={onDeletePresentation}
        />
      );
    }

    const config = ACTIVITY_CONFIG[item.type];

    if (item.type === 'quiz') {
      const quiz = item.data as Quiz;
      return (
        <ContentCard
          key={quiz.id}
          id={quiz.id}
          title={quiz.title}
          description={getActivityDescription(item)}
          icon={config.icon}
          iconColor={config.color}
          editPath={config.editPath(quiz.id)}
          onHost={onHostGame}
          onDelete={onDeleteQuiz}
          onPreview={() => onPreviewQuiz(quiz)}
          previewLabel="Preview Quiz"
          onShare={() => onShareQuiz({ id: quiz.id, title: quiz.title })}
          onExport={() => exportActivity('quiz', quiz.title, quiz as unknown as Record<string, unknown>)}
        />
      );
    }

    if (item.type === 'poll') {
      const poll = item.data as PollActivity;
      return (
        <ContentCard
          key={poll.id}
          id={poll.id}
          title={poll.title}
          description={getActivityDescription(item)}
          icon={config.icon}
          iconColor={config.color}
          editPath={config.editPath(poll.id)}
          hostGradient={config.gradient}
          onHost={onHostActivity}
          onDelete={onDeleteActivity}
          onPreview={() => onPreviewPoll(poll)}
          previewLabel="Preview Poll"
          onShare={() => onSharePoll({ id: poll.id, title: poll.title })}
          onExport={() => exportActivity('poll', poll.title, poll as unknown as Record<string, unknown>)}
        />
      );
    }

    // thoughts-gathering, evaluation
    const activity = item.data as Activity;
    return (
      <ContentCard
        key={activity.id}
        id={activity.id}
        title={activity.title}
        description={getActivityDescription(item)}
        icon={config.icon}
        iconColor={config.color}
        editPath={config.editPath(activity.id)}
        hostHref={config.detailPath(activity.id)}
        hostGradient={config.gradient}
        onDelete={onDeleteActivity}
        onExport={() => exportActivity(item.type, activity.title, activity as unknown as Record<string, unknown>)}
      />
    );
  };

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
          {onImport && (
            <Button variant="outline" onClick={onImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/host/create">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Explore Activity Types
            </Link>
          </Button>
          <CreateDropdown />
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="pl-9"
          />
        </div>
      </div>

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
      ) : sortedItems.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EmptyContentState filterType={filterType} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map(renderItem)}
        </div>
      )}
    </div>
  );
}
