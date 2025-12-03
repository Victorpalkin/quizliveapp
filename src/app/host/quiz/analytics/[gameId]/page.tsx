'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { useUser, useFunctions } from '@/firebase';
import { useGameAnalytics } from './hooks/use-game-analytics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { ArrowLeft, BarChart3, TrendingUp, HelpCircle, Trophy, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { OverviewTab } from './components/overview-tab';
import { QuestionsTab } from './components/questions-tab';
import { LeaderboardTab } from './components/leaderboard-tab';
import { PositionRaceTab } from './components/position-race-tab';

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const { user, loading: userLoading } = useUser();
  const functions = useFunctions();

  const { game, analytics, loading, analyticsExists } = useGameAnalytics(gameId);

  // State for auto-generating analytics
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationAttempted = useRef(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Auto-generate analytics when page loads and analytics don't exist
  useEffect(() => {
    // Only attempt once per page load
    if (generationAttempted.current) return;

    // Wait for data to load
    if (loading || userLoading) return;

    // Check prerequisites
    if (!user || !game || game.hostId !== user.uid || game.state !== 'ended') return;

    // If analytics already exist, no need to generate
    if (analyticsExists && analytics) return;

    // Generate analytics
    generationAttempted.current = true;
    generateAnalytics();
  }, [loading, userLoading, user, game, analyticsExists, analytics]);

  const generateAnalytics = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const computeGameAnalytics = httpsCallable(functions, 'computeGameAnalytics');
      await computeGameAnalytics({ gameId });
      // Analytics will be loaded via the real-time listener in useGameAnalytics
    } catch (error: any) {
      console.error('[Analytics] Error generating analytics:', error);
      const errorMessage = error?.message || error?.code || 'Failed to generate analytics';
      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    generationAttempted.current = false;
    setGenerationError(null);
    generateAnalytics();
  };

  // Loading state
  if (loading || userLoading) {
    return <FullPageLoader message="Loading analytics..." />;
  }

  // Not logged in (will redirect)
  if (!user) {
    return <FullPageLoader message="Redirecting..." />;
  }

  // Game not found
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
        <p className="text-muted-foreground mb-6">This game may have been deleted.</p>
        <Button asChild>
          <Link href="/host">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Authorization check
  if (game.hostId !== user.uid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You can only view analytics for your own games.</p>
        <Button asChild>
          <Link href="/host">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Game not ended
  if (game.state !== 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Clock className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Game In Progress</h1>
        <p className="text-muted-foreground mb-6">Analytics are only available after the game ends.</p>
        <Button asChild>
          <Link href={`/host/quiz/game/${gameId}`}>Go to Game</Link>
        </Button>
      </div>
    );
  }

  // Generating analytics
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Loader2 className="h-16 w-16 text-primary mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-2">Generating Analytics</h1>
        <p className="text-muted-foreground mb-6">
          Crunching the numbers... This may take a moment.
        </p>
      </div>
    );
  }

  // Generation error
  if (generationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Failed to Generate Analytics</h1>
        <p className="text-muted-foreground mb-2">
          {generationError}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Please try again or contact support if the issue persists.
        </p>
        <div className="flex gap-4">
          <Button onClick={handleRetry}>
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/host">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Analytics not generated yet (shouldn't normally reach here due to auto-generation)
  if (!analyticsExists || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Loader2 className="h-16 w-16 text-primary mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-2">Preparing Analytics</h1>
        <p className="text-muted-foreground mb-6">
          Setting up your analytics dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/host">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{analytics.quizTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {analytics.totalPlayers} players &bull; {analytics.totalQuestions} questions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Questions</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="race" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Position Race</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab analytics={analytics} />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionsTab analytics={analytics} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardTab analytics={analytics} />
          </TabsContent>

          <TabsContent value="race">
            <PositionRaceTab analytics={analytics} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
