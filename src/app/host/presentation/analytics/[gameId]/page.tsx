'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useUser, useFunctions } from '@/firebase';
import { useAnalytics } from './hooks/use-analytics';
import { OverviewTab } from './components/overview-tab';
import { SlidesTab } from './components/slides-tab';
import { EngagementTab } from './components/engagement-tab';
import { LeaderboardTab } from './components/leaderboard-tab';

export default function PresentationAnalyticsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const functions = useFunctions();
  const { analytics, loading } = useAnalytics(gameId);
  const [tab, setTab] = useState('overview');
  const generationAttempted = useRef(false);

  // Auto-trigger analytics computation if not yet computed
  useEffect(() => {
    if (generationAttempted.current || loading || authLoading) return;
    if (!user || !functions || analytics) return;
    generationAttempted.current = true;
    const fn = httpsCallable(functions, 'computePresentationAnalytics');
    fn({ gameId }).catch(() => {});
  }, [loading, authLoading, user, functions, analytics, gameId]);

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
      <div className="flex items-center gap-3 px-6 py-4 border-b backdrop-blur-md bg-background/90">
        <Button variant="ghost" size="icon" onClick={() => router.push('/host')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Presentation Analytics</h1>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {!analytics ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Computing analytics...
            </p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4 glass-subtle">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="slides">Slides</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="overview" className="mt-6" forceMount={tab === 'overview' ? true : undefined}>
                  <OverviewTab analytics={analytics} />
                </TabsContent>
                <TabsContent value="slides" className="mt-6" forceMount={tab === 'slides' ? true : undefined}>
                  <SlidesTab analytics={analytics} />
                </TabsContent>
                <TabsContent value="engagement" className="mt-6" forceMount={tab === 'engagement' ? true : undefined}>
                  <EngagementTab analytics={analytics} />
                </TabsContent>
                <TabsContent value="leaderboard" className="mt-6" forceMount={tab === 'leaderboard' ? true : undefined}>
                  <LeaderboardTab analytics={analytics} />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        )}
      </div>
    </div>
  );
}
