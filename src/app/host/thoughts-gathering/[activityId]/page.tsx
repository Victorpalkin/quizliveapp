'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Pencil, BarChart3, History } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, DocumentReference, query, where, orderBy, limit, Query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { thoughtsGatheringActivityConverter, gameConverter } from '@/firebase/converters';
import type { ThoughtsGatheringActivity, Game } from '@/lib/types';
import { DetailPageLayout } from '../../components/detail-page-layout';
import { formatRelativeTime } from '@/lib/utils/format-date';

export default function ThoughtsGatheringDetailPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [isLaunching, setIsLaunching] = useState(false);

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>,
    [firestore, activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  const completedGamesQuery = useMemoFirebase(
    () => user ? query(
      collection(firestore, 'games').withConverter(gameConverter),
      where('activityId', '==', activityId),
      where('hostId', '==', user.uid),
      where('state', '==', 'ended'),
      orderBy('createdAt', 'desc'),
      limit(5)
    ) as Query<Game> : null,
    [firestore, activityId, user]
  );
  const { data: completedGames, loading: gamesLoading } = useCollection<Game>(completedGamesQuery);

  const handleLaunchSession = async () => {
    if (!user || !activity) return;

    setIsLaunching(true);

    try {
      const gameData = {
        activityType: 'thoughts-gathering' as const,
        activityId: activityId,
        quizId: '',
        hostId: user.uid,
        state: 'collecting' as const,
        currentQuestionIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
        submissionsOpen: true,
      };

      const gameDoc = await addDoc(collection(firestore, 'games'), gameData);

      toast({
        title: 'Session Started!',
        description: 'Participants can now join and submit.',
      });

      router.push(`/host/thoughts-gathering/game/${gameDoc.id}`);
    } catch (error) {
      console.error('Error launching session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not launch the session. Please try again.",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <DetailPageLayout
      activityType="thoughts-gathering"
      title={activity?.title || ''}
      subtitle="Thoughts Gathering Activity"
      isLaunching={isLaunching}
      onLaunch={handleLaunchSession}
      launchDescription="Launch a live session to collect interests from your audience"
      loading={userLoading || activityLoading || gamesLoading}
      notFound={!activity && !activityLoading}
      notFoundLabel="Activity"
    >
      {/* Configuration Card */}
      <Card className="shadow-md rounded-2xl border border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Configuration</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/host/thoughts-gathering/edit/${activityId}`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity?.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{activity.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Prompt for Participants</p>
            <p className="text-base bg-muted p-3 rounded-lg mt-1">
              &ldquo;{activity?.config.prompt}&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Max Submissions</p>
              <p className="text-lg font-semibold">{activity?.config.maxSubmissionsPerPlayer} per person</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Multiple Rounds</p>
              <p className="text-lg font-semibold">{activity?.config.allowMultipleRounds ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Evaluation from Past Sessions */}
      {completedGames && completedGames.length > 0 && (
        <Card className="shadow-lg rounded-2xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Create Evaluation from Results</CardTitle>
                <CardDescription>
                  Turn collected topics into a prioritization session
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a past session to use its topics as evaluation items:
            </p>
            <div className="space-y-2">
              {completedGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">PIN: {game.gamePin}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(game.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/host/evaluation/create-from-thoughts?activityId=${activityId}&gameId=${game.id}&source=topics`)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Create Evaluation
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DetailPageLayout>
  );
}
