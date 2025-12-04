'use client';

import Link from 'next/link';
import { FileQuestion, Cloud, BarChart3, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FilterType = 'all' | 'quiz' | 'interest-cloud' | 'ranking';

interface EmptyContentStateProps {
  filterType: FilterType;
}

const activityConfig = {
  quiz: {
    title: 'Quiz',
    icon: FileQuestion,
    href: '/host/quiz/create',
    gradient: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-500',
    aiHref: '/host/quiz/create-ai',
  },
  'interest-cloud': {
    title: 'Interest Cloud',
    icon: Cloud,
    href: '/host/interest-cloud/create',
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
    aiHref: null,
  },
  ranking: {
    title: 'Ranking',
    icon: BarChart3,
    href: '/host/ranking/create',
    gradient: 'from-orange-500 to-red-500',
    iconColor: 'text-orange-500',
    aiHref: null,
  },
};

export function EmptyContentState({ filterType }: EmptyContentStateProps) {
  const config = filterType !== 'all' ? activityConfig[filterType] : null;

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">Nothing here</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {filterType === 'all'
          ? "You haven't created any activities yet"
          : `You haven't created any ${config?.title.toLowerCase()}s yet`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {config ? (
          <>
            <Button asChild variant="gradient" className={`bg-gradient-to-r ${config.gradient}`}>
              <Link href={config.href}>
                <config.icon className="h-4 w-4 mr-2" />
                Create {config.title}
              </Link>
            </Button>
            {config.aiHref && (
              <Button asChild variant="outline">
                <Link href={config.aiHref}>
                  <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                  Create with AI
                </Link>
              </Button>
            )}
          </>
        ) : (
          <Button asChild variant="gradient">
            <Link href="/host/create">
              Create Activity
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
