'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { Cloud, StopCircle, Loader2, RefreshCw, Home, MessageSquare, Users, QrCode, Copy, PlayCircle, PauseCircle, XCircle } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, ThoughtsGatheringActivity, ThoughtSubmission, TopicCloudResult } from '@/lib/types';
import { gameConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { clearHostSession, saveHostSession } from '@/lib/host-session';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { WordCloud } from '@/components/app/word-cloud';
import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { KeyboardShortcutsHint } from '@/components/app/game-header';
import { HostActionHint } from '@/components/app/host-action-hint';

export default function ThoughtsGatheringGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

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

  // Set join URL
  useEffect(() => {
    if (game?.gamePin) {
      setJoinUrl(`${window.location.origin}/play/${game.gamePin}`);
    }
  }, [game?.gamePin]);

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

  // PIN/QR Section (always visible when session is active)
  const renderJoinSection = () => {
    if (game?.state === 'ended') return null;

    return (
      <Card className="border border-card-border shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* PIN Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">PIN</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-widest">{game?.gamePin}</span>
                {game?.gamePin && <CopyButton text={game.gamePin} />}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-8 w-px bg-border" />

            {/* Participants */}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{players?.length || 0} joined</span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-8 w-px bg-border" />

            {/* QR & Link Actions */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium">Scan to join</p>
                    {joinUrl && (
                      <div className="bg-white p-3 rounded-lg">
                        <QRCodeSVG value={joinUrl} size={160} level="M" />
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(joinUrl)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
            {/* Word Cloud */}
            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-6">Interest Cloud</h2>
                {topicCloud?.topics && topicCloud.topics.length > 0 ? (
                  <WordCloud topics={topicCloud.topics} />
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No topics extracted
                  </p>
                )}
              </CardContent>
            </Card>

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
                  <p className="text-muted-foreground">Topics</p>
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
          </div>
        );

      case 'ended':
        return (
          <div className="space-y-6">
            {/* Final Results */}
            <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-6">Session Complete!</h2>
                {topicCloud?.topics && topicCloud.topics.length > 0 ? (
                  <WordCloud topics={topicCloud.topics} />
                ) : (
                  <p className="text-center text-muted-foreground py-12">No topics collected</p>
                )}
              </CardContent>
            </Card>

            {/* Return Button */}
            <Button
              onClick={handleReturnToDashboard}
              size="lg"
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <Cloud className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">{activity?.title || 'Interest Cloud'}</h1>
          </div>
        </div>

        {/* PIN/QR Section - always visible */}
        {renderJoinSection()}

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
