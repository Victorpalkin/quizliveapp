'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { useAnalytics } from './hooks/use-analytics';
import { OverviewTab } from './components/overview-tab';
import { SlidesTab } from './components/slides-tab';
import { EngagementTab } from './components/engagement-tab';
import { LeaderboardTab } from './components/leaderboard-tab';

export default function PresentationAnalyticsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { analytics, loading } = useAnalytics(gameId);
  const [tab, setTab] = useState('overview');

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/host')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Presentation Analytics</h1>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {!analytics ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Analytics are being computed. This may take a moment after the presentation ends.
            </p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="slides">Slides</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab analytics={analytics} />
            </TabsContent>
            <TabsContent value="slides" className="mt-6">
              <SlidesTab analytics={analytics} />
            </TabsContent>
            <TabsContent value="engagement" className="mt-6">
              <EngagementTab analytics={analytics} />
            </TabsContent>
            <TabsContent value="leaderboard" className="mt-6">
              <LeaderboardTab analytics={analytics} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
