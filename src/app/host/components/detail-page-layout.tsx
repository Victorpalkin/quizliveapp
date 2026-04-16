'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
import type { ActivityType } from '@/lib/types';

// Pre-defined card styles to avoid Tailwind purge issues
const CARD_STYLES: Record<string, { border: string; bg: string }> = {
  'thoughts-gathering': {
    border: 'border-2 border-blue-500/20',
    bg: 'bg-gradient-to-br from-blue-500/5 to-purple-500/5',
  },
  evaluation: {
    border: 'border-2 border-orange-500/20',
    bg: 'bg-gradient-to-br from-orange-500/5 to-red-500/5',
  },
  poll: {
    border: 'border-2 border-teal-500/20',
    bg: 'bg-gradient-to-br from-teal-500/5 to-cyan-500/5',
  },
  quiz: {
    border: 'border-2 border-primary/20',
    bg: 'bg-gradient-to-br from-primary/5 to-accent/5',
  },
  presentation: {
    border: 'border-2 border-indigo-500/20',
    bg: 'bg-gradient-to-br from-indigo-500/5 to-purple-500/5',
  },
};

interface DetailPageLayoutProps {
  /** Activity type for styling */
  activityType: ActivityType;
  /** Page title */
  title: string;
  /** Subtitle text */
  subtitle: string;
  /** Whether the launch action is in progress */
  isLaunching: boolean;
  /** Handler for the launch button */
  onLaunch: () => void;
  /** Custom launch description */
  launchDescription?: string;
  /** Whether data is loading */
  loading: boolean;
  /** Whether the item was not found */
  notFound?: boolean;
  /** Label for the not-found message */
  notFoundLabel?: string;
  /** Activity-specific content (config cards, etc.) */
  children: React.ReactNode;
}

export function DetailPageLayout({
  activityType,
  title,
  subtitle,
  isLaunching,
  onLaunch,
  launchDescription = 'Launch a live session with your audience',
  loading,
  notFound = false,
  notFoundLabel = 'Activity',
  children,
}: DetailPageLayoutProps) {
  const config = ACTIVITY_CONFIG[activityType];
  const Icon = config.icon;
  const cardStyle = CARD_STYLES[activityType] || CARD_STYLES.quiz;

  if (loading) {
    return <FullPageLoader />;
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl flex items-center justify-center">
          <Card className="text-center p-8">
            <CardTitle className="text-2xl mb-4">{notFoundLabel} Not Found</CardTitle>
            <CardDescription className="mb-6">
              This {notFoundLabel.toLowerCase()} may have been deleted or you don&apos;t have access to it.
            </CardDescription>
            <Button asChild>
              <Link href="/host">Back to Dashboard</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/host">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Icon className={`h-10 w-10 ${config.color}`} />
            <div>
              <h1 className="text-4xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Launch Card */}
          <Card className={`shadow-lg rounded-2xl ${cardStyle.border} ${cardStyle.bg}`}>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-2">Ready to Start?</h2>
              <p className="text-muted-foreground mb-6">{launchDescription}</p>
              <Button
                onClick={onLaunch}
                disabled={isLaunching}
                size="lg"
                className={`px-12 py-6 text-lg bg-gradient-to-r ${config.gradient} hover:opacity-90 rounded-xl`}
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Launching...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-6 w-6" /> Launch Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {children}
        </div>
      </main>
    </div>
  );
}
