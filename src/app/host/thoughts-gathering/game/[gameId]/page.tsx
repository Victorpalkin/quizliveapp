'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StopCircle, Loader2, RefreshCw, Home, MessageSquare, Users, PlayCircle, PauseCircle, XCircle, BarChart3, Download, Bot, Star, ExternalLink } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, updateDoc, deleteDoc, DocumentReference, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';
import { gameConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { clearHostSession, saveHostSession } from '@/lib/host-session';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { GameHeader, KeyboardShortcutsHint } from '@/components/app/game-header';
import { HostActionHint, ReadinessChecklist } from '@/components/app/host-action-hint';
import { exportThoughtsToMarkdown, downloadMarkdown, generateExportFilename } from '@/lib/export-thoughts';

export default function ThoughtsGatheringGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Typed ref for reading with converter
  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Plain ref for updates (updateDoc doesn't work well with converters)
  const gameDocRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId),
    [firestore, gameId]
  );

  // Fetch activity
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity } = useDoc(activityRef);

  // Fetch participants
  const playersQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'players') : null,
    [firestore, gameId, game]
  );
  const { data: players, loading: playersLoading } = useCollection(playersQuery);

  // Fetch submissions
  const submissionsQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'submissions').withConverter(thoughtSubmissionConverter) as Query<ThoughtSubmission> : null,
    [firestore, gameId, game]
  );
  const { data: submissions, loading: submissionsLoading } = useCollection<ThoughtSubmission>(submissionsQuery);

  // Fetch topic cloud result
  const topicsRef = useMemoFirebase(
    () => game ? doc(firestore, 'games', gameId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult> : null,
    [firestore, gameId, game]
  );
  const { data: topicCloud } = useDoc(topicsRef);

  // Save host session
  useEffect(() => {
    if (game && activity && user) {
      saveHostSession(gameId, game.gamePin, game.activityId || '', activity.title, user.uid, 'thoughts-gathering', game.state);
    }
  }, [gameId, game, activity, user, game?.state]);

  // Cancel game handler for GameHeader
  const handleCancelGame = useCallback(() => {
    if (!gameDocRef) return;
    clearHostSession();
    deleteDoc(gameDocRef)
      .then(() => router.push('/host'))
      .catch(error => console.error('Error deleting game:', error));
  }, [gameDocRef, router]);

  const handleToggleSubmissions = async () => {
    if (!gameDocRef || !game) return;

    try {
      await updateDoc(gameDocRef, { submissionsOpen: !game.submissionsOpen });
    } catch (error) {
      console.error("Error toggling submissions: ", error);
    }
  };

  const handleStopAndProcess = async () => {
    if (!gameDocRef) return;

    setIsProcessing(true);

    try {
      // Close submissions and update state to processing
      await updateDoc(gameDocRef, { state: 'processing', submissionsOpen: false });

      // Call the AI function to extract topics
      const functions = getFunctions(undefined, 'europe-west4');
      const extractTopics = httpsCallable(functions, 'extractTopics');

      await extractTopics({ gameId });

      // State will be updated to 'display' by the cloud function
    } catch (error) {
      console.error("Error processing submissions: ", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Could not process submissions. Please try again.",
      });
      // Revert to collecting state
      await updateDoc(gameDocRef, { state: 'collecting', submissionsOpen: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectMore = async () => {
    if (!gameDocRef) return;

    try {
      await updateDoc(gameDocRef, { state: 'collecting', submissionsOpen: true });
    } catch (error) {
      console.error("Error resuming collection: ", error);
    }
  };

  const handleEndSession = async () => {
    if (!gameDocRef) return;

    try {
      await updateDoc(gameDocRef, { state: 'ended', submissionsOpen: false });
      clearHostSession();
    } catch (error) {
      console.error("Error ending session: ", error);
    }
  };

  const handleReturnToDashboard = () => {
    clearHostSession();
    router.push('/host');
  };

  const handleExportResults = useCallback(() => {
    if (!topicCloud?.topics || !submissions || !activity) return;

    const markdown = exportThoughtsToMarkdown(
      activity.title,
      topicCloud.topics,
      submissions,
      players?.length || 0,
      topicCloud.processedAt?.toDate?.(),
      topicCloud.agentMatches,
      topicCloud.topMatureAgents
    );

    const filename = generateExportFilename(activity.title);
    downloadMarkdown(markdown, filename);
  }, [topicCloud, submissions, activity, players?.length]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      if (game?.state === 'collecting') {
        handleToggleSubmissions();
      } else if (game?.state === 'display' && activity?.config.allowMultipleRounds) {
        handleCollectMore();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (game?.state === 'collecting' && submissions?.length) {
        handleStopAndProcess();
      } else if (game?.state === 'display') {
        handleEndSession();
      }
    }
  }, [game?.state, activity?.config.allowMultipleRounds, submissions?.length]);

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (userLoading || gameLoading) {
    return <FullPageLoader />;
  }

  const renderContent = () => {
    switch (game?.state) {
      case 'collecting':
        return (
          <div className="space-y-6">
            {/* Submission Status */}
            <Card className={`border-2 ${game.submissionsOpen ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5' : 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <MessageSquare className={`h-10 w-10 ${game.submissionsOpen ? 'text-green-500' : 'text-orange-500'}`} />
                    <div>
                      <p className="text-4xl font-bold">{submissions?.length || 0}</p>
                      <p className="text-muted-foreground">Submissions</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleSubmissions}
                    variant={game.submissionsOpen ? "outline" : "default"}
                    size="lg"
                    className={game.submissionsOpen ? '' : 'bg-green-500 hover:bg-green-600'}
                  >
                    {game.submissionsOpen ? (
                      <>
                        <PauseCircle className="mr-2 h-5 w-5" />
                        Pause Submissions
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Resume Submissions
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {game.submissionsOpen
                    ? 'Participants can submit their interests now'
                    : 'Submissions are paused - participants are waiting'}
                </p>
              </CardContent>
            </Card>

            {/* Prompt */}
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg italic">"{activity?.config.prompt}"</p>
              </CardContent>
            </Card>

            {/* Recent Submissions Preview */}
            {submissions && submissions.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {submissions.slice(-5).reverse().map(sub => (
                      <div key={sub.id} className="flex items-start gap-3 p-2 bg-muted rounded-lg">
                        <span className="font-medium text-sm">{sub.playerName}:</span>
                        <span className="text-sm text-muted-foreground">{sub.rawText}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            {players && players.length > 0 && (
              <Card className="border border-card-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Participants</CardTitle>
                    <span className="text-sm text-muted-foreground">{players.length} joined</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {players.map(player => (
                      <span
                        key={player.id}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                      >
                        {player.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleStopAndProcess}
                size="lg"
                disabled={!submissions?.length}
                className="flex-1 py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
              >
                <StopCircle className="mr-2 h-6 w-6" />
                Analyze Results
              </Button>
              <Button
                onClick={handleEndSession}
                size="lg"
                variant="outline"
                className="py-6 text-lg"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Finish
              </Button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto mb-6 text-blue-500 animate-spin" />
              <h2 className="text-2xl font-bold mb-2">Processing Submissions</h2>
              <p className="text-muted-foreground">
                AI is extracting and grouping topics...
              </p>
            </CardContent>
          </Card>
        );

      case 'display':
        return (
          <div className="space-y-6">
            {/* Results Display */}
            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <CardContent className="p-8">
                {/* Header with export button */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Grouped Submissions</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResults}
                    className="h-8"
                    disabled={!topicCloud?.topics?.length}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                </div>
                {topicCloud?.topics && topicCloud.topics.length > 0 ? (
                  <ThoughtsGroupedView
                    topics={topicCloud.topics}
                    submissions={submissions || []}
                    agentMatches={topicCloud.agentMatches}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No groups extracted
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Mature Agents Card */}
            {topicCloud?.topMatureAgents && topicCloud.topMatureAgents.length > 0 && (
              <Card className="border-2 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6 text-violet-500" />
                    <div>
                      <CardTitle className="text-lg">Top Mature AI Agents</CardTitle>
                      <CardDescription>
                        Most mature agents matching your collected topics
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topicCloud.topMatureAgents.map((agent, index) => (
                      <div
                        key={agent.uniqueId}
                        className="flex items-start gap-3 p-3 bg-background/50 border border-violet-500/20 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-600">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {agent.referenceLink ? (
                              <a
                                href={agent.referenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                              >
                                {agent.agentName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-medium text-violet-600 dark:text-violet-400">
                                {agent.agentName}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs border-violet-500/30">
                              <Star className="h-3 w-3 mr-1" />
                              {agent.maturity}
                            </Badge>
                          </div>
                          {agent.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {agent.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {agent.functionalArea && (
                              <span className="text-xs text-muted-foreground">
                                {agent.functionalArea}
                              </span>
                            )}
                            {agent.industry && (
                              <span className="text-xs text-muted-foreground">
                                • {agent.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold">{players?.length || 0}</p>
                  <p className="text-muted-foreground">Participants</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold">{submissions?.length || 0}</p>
                  <p className="text-muted-foreground">Submissions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold">{topicCloud?.topics?.length || 0}</p>
                  <p className="text-muted-foreground">Groups</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {activity?.config.allowMultipleRounds && (
                <Button
                  onClick={handleCollectMore}
                  variant="outline"
                  size="lg"
                  className="flex-1 py-6"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Collect More
                </Button>
              )}
              <Button
                onClick={handleEndSession}
                size="lg"
                className="flex-1 py-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
              >
                End Session
              </Button>
            </div>

            {/* Create Evaluation from Topics */}
            {topicCloud?.topics && topicCloud.topics.length > 0 && (
              <Card className="border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-orange-500" />
                      <div>
                        <h3 className="font-semibold">Create Evaluation</h3>
                        <p className="text-sm text-muted-foreground">
                          Turn these topics into a prioritization session
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/host/evaluation/create-from-thoughts?activityId=${game?.activityId}&gameId=${gameId}&source=topics`)}
                      variant="outline"
                      className="border-orange-500/30 hover:bg-orange-500/10"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'ended':
        return (
          <div className="space-y-6">
            {/* Final Results */}
            <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5">
              <CardContent className="p-8">
                {/* Header with export button */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Session Complete!</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResults}
                    className="h-8"
                    disabled={!topicCloud?.topics?.length}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                </div>
                {topicCloud?.topics && topicCloud.topics.length > 0 ? (
                  <ThoughtsGroupedView
                    topics={topicCloud.topics}
                    submissions={submissions || []}
                    agentMatches={topicCloud.agentMatches}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-12">No groups collected</p>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Mature Agents Card (Ended state) */}
            {topicCloud?.topMatureAgents && topicCloud.topMatureAgents.length > 0 && (
              <Card className="border-2 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6 text-violet-500" />
                    <div>
                      <CardTitle className="text-lg">Top Mature AI Agents</CardTitle>
                      <CardDescription>
                        Most mature agents matching your collected topics
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topicCloud.topMatureAgents.map((agent, index) => (
                      <div
                        key={agent.uniqueId}
                        className="flex items-start gap-3 p-3 bg-background/50 border border-violet-500/20 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-600">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {agent.referenceLink ? (
                              <a
                                href={agent.referenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                              >
                                {agent.agentName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-medium text-violet-600 dark:text-violet-400">
                                {agent.agentName}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs border-violet-500/30">
                              <Star className="h-3 w-3 mr-1" />
                              {agent.maturity}
                            </Badge>
                          </div>
                          {agent.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {agent.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {agent.functionalArea && (
                              <span className="text-xs text-muted-foreground">
                                {agent.functionalArea}
                              </span>
                            )}
                            {agent.industry && (
                              <span className="text-xs text-muted-foreground">
                                • {agent.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create Evaluation from Results */}
            {topicCloud?.topics && topicCloud.topics.length > 0 && (
              <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-orange-500" />
                    <div>
                      <CardTitle>Continue with Evaluation</CardTitle>
                      <CardDescription>
                        Prioritize the collected topics with your audience
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => router.push(`/host/evaluation/create-from-thoughts?activityId=${game?.activityId}&gameId=${gameId}&source=topics`)}
                    size="lg"
                    className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Create Evaluation from Topics
                  </Button>
                  <Button
                    onClick={() => router.push(`/host/evaluation/create-from-thoughts?activityId=${game?.activityId}&gameId=${gameId}&source=submissions`)}
                    variant="outline"
                    size="lg"
                    className="w-full py-6"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Create from Raw Submissions
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Return Button */}
            <Button
              onClick={handleReturnToDashboard}
              size="lg"
              variant="outline"
              className="w-full py-6 text-lg"
            >
              <Home className="mr-2 h-5 w-5" />
              Return to Dashboard
            </Button>
          </div>
        );

      default:
        return <FullPageLoader />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8 max-w-3xl">
        {/* Game Header (hidden when ended) */}
        {game?.state !== 'ended' && (
          <GameHeader
            gamePin={game?.gamePin || ''}
            playerCount={players?.length || 0}
            activityType="thoughts-gathering"
            title={activity?.title}
            onCancel={handleCancelGame}
            isLive={game?.state !== 'collecting'}
            showKeyboardHint={true}
          />
        )}

        {/* State Badge and Host Action Hint (not shown when ended) */}
        {game?.state !== 'ended' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {game?.state === 'collecting' && (game.submissionsOpen ? 'Collecting Responses' : 'Submissions Paused')}
              {game?.state === 'processing' && 'Analyzing...'}
              {game?.state === 'display' && 'Viewing Results'}
            </Badge>
            <HostActionHint
              gameState={game?.state || 'collecting'}
              activityType="thoughts-gathering"
              totalPlayers={players?.length || 0}
              submissionsCount={submissions?.length || 0}
              allowMultipleRounds={activity?.config.allowMultipleRounds}
            />
          </div>
        )}

        {/* Readiness Checklist (only during collecting) */}
        {game?.state === 'collecting' && (
          <div className="mb-6">
            <ReadinessChecklist
              items={[
                { label: 'Participants joined', isReady: (players?.length || 0) > 0, detail: `${players?.length || 0}` },
                { label: 'Submissions received', isReady: (submissions?.length || 0) > 0, detail: `${submissions?.length || 0}` },
              ]}
            />
          </div>
        )}

        {renderContent()}

        {/* Keyboard Shortcuts Hint */}
        {game?.state !== 'ended' && game?.state !== 'processing' && (
          <KeyboardShortcutsHint
            shortcuts={
              game?.state === 'collecting'
                ? [
                    { key: 'Space', action: game.submissionsOpen ? 'Pause' : 'Resume' },
                    { key: 'Enter', action: 'Analyze' },
                  ]
                : game?.state === 'display'
                ? [
                    ...(activity?.config.allowMultipleRounds ? [{ key: 'Space', action: 'Collect More' }] : []),
                    { key: 'Enter', action: 'End Session' },
                  ]
                : []
            }
            className="justify-center mt-6"
          />
        )}
      </main>
    </div>
  );
}
