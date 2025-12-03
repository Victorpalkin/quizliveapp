'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { Cloud, StopCircle, Loader2, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, updateDoc, DocumentReference, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Game, InterestCloudActivity, InterestSubmission, TopicCloudResult } from '@/lib/types';
import { gameConverter, interestCloudActivityConverter, interestSubmissionConverter } from '@/firebase/converters';
import { clearHostSession } from '@/lib/host-session';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { WordCloud } from '@/components/app/word-cloud';
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

export default function InterestCloudGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const gameRef = useMemoFirebase(
    () => doc(firestore, 'games', gameId).withConverter(gameConverter) as DocumentReference<Game>,
    [firestore, gameId]
  );
  const { data: game, loading: gameLoading } = useDoc(gameRef);

  // Fetch activity
  const activityRef = useMemoFirebase(
    () => game?.activityId
      ? doc(firestore, 'activities', game.activityId).withConverter(interestCloudActivityConverter) as DocumentReference<InterestCloudActivity>
      : null,
    [firestore, game?.activityId]
  );
  const { data: activity } = useDoc(activityRef);

  // Fetch submissions
  const submissionsQuery = useMemoFirebase(
    () => game ? collection(firestore, 'games', gameId, 'submissions').withConverter(interestSubmissionConverter) as Query<InterestSubmission> : null,
    [firestore, gameId, game]
  );
  const { data: submissions, loading: submissionsLoading } = useCollection<InterestSubmission>(submissionsQuery);

  // Fetch topic cloud result
  const topicsRef = useMemoFirebase(
    () => game ? doc(firestore, 'games', gameId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult> : null,
    [firestore, gameId, game]
  );
  const { data: topicCloud } = useDoc(topicsRef);

  const handleStopAndProcess = async () => {
    if (!gameRef) return;

    setIsProcessing(true);

    try {
      // First update state to processing
      await updateDoc(gameRef, { state: 'processing' });

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
      await updateDoc(gameRef, { state: 'collecting' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectMore = async () => {
    if (!gameRef) return;

    try {
      await updateDoc(gameRef, { state: 'collecting' });
    } catch (error) {
      console.error("Error resuming collection: ", error);
    }
  };

  const handleEndSession = async () => {
    if (!gameRef) return;

    try {
      await updateDoc(gameRef, { state: 'ended' });
      clearHostSession();
    } catch (error) {
      console.error("Error ending session: ", error);
    }
  };

  const handleReturnToDashboard = () => {
    clearHostSession();
    router.push('/host');
  };

  if (userLoading || gameLoading) {
    return <FullPageLoader />;
  }

  const renderContent = () => {
    switch (game?.state) {
      case 'collecting':
        return (
          <div className="space-y-6">
            {/* Submission Count */}
            <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <p className="text-6xl font-bold mb-2">{submissions?.length || 0}</p>
                <p className="text-xl text-muted-foreground">Submissions Received</p>
              </CardContent>
            </Card>

            {/* Prompt */}
            <Card className="border border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Current Prompt</CardTitle>
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

            {/* Stop & Process Button */}
            <Button
              onClick={handleStopAndProcess}
              size="lg"
              disabled={!submissions?.length}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
            >
              <StopCircle className="mr-2 h-6 w-6" />
              Stop & Process Results
            </Button>
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
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold">{submissions?.length || 0}</p>
                  <p className="text-muted-foreground">Total Submissions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold">{topicCloud?.topics?.length || 0}</p>
                  <p className="text-muted-foreground">Unique Topics</p>
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
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <Cloud className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">{activity?.title || 'Interest Cloud'}</h1>
            <p className="text-muted-foreground">PIN: {game?.gamePin}</p>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
}
