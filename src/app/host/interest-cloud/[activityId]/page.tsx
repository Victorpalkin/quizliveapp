'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { Cloud, ArrowLeft, Play, Loader2, Settings } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { interestCloudActivityConverter } from '@/firebase/converters';
import type { InterestCloudActivity } from '@/lib/types';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function InterestCloudDetailPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [isLaunching, setIsLaunching] = useState(false);

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(interestCloudActivityConverter) as DocumentReference<InterestCloudActivity>,
    [firestore, activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  const handleLaunchSession = async () => {
    if (!user || !activity) return;

    setIsLaunching(true);

    try {
      const gameData = {
        activityType: 'interest-cloud' as const,
        activityId: activityId,
        quizId: '', // Empty for non-quiz activities
        hostId: user.uid,
        state: 'lobby' as const,
        currentQuestionIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
      };

      const gameDoc = await addDoc(collection(firestore, 'games'), gameData);

      toast({
        title: 'Session Created!',
        description: 'Your Interest Cloud lobby is now open.',
      });

      router.push(`/host/interest-cloud/lobby/${gameDoc.id}`);
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

  if (userLoading || activityLoading) {
    return <FullPageLoader />;
  }

  if (!activity) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl flex items-center justify-center">
          <Card className="text-center p-8">
            <CardTitle className="text-2xl mb-4">Activity Not Found</CardTitle>
            <CardDescription className="mb-6">
              This activity may have been deleted or you don't have access to it.
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
            <Cloud className="h-10 w-10 text-blue-500" />
            <div>
              <h1 className="text-4xl font-bold">{activity.title}</h1>
              <p className="text-muted-foreground">Interest Cloud Activity</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Launch Card */}
          <Card className="shadow-lg rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-2">Ready to Start?</h2>
              <p className="text-muted-foreground mb-6">
                Launch a live session to collect interests from your audience
              </p>
              <Button
                onClick={handleLaunchSession}
                disabled={isLaunching}
                size="lg"
                className="px-12 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 rounded-xl"
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

          {/* Configuration Card */}
          <Card className="shadow-md rounded-2xl border border-card-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-base">{activity.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">Prompt for Participants</p>
                <p className="text-base bg-muted p-3 rounded-lg mt-1">
                  "{activity.config.prompt}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Submissions</p>
                  <p className="text-lg font-semibold">{activity.config.maxSubmissionsPerPlayer} per person</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Multiple Rounds</p>
                  <p className="text-lg font-semibold">{activity.config.allowMultipleRounds ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it Works */}
          <Card className="shadow-md rounded-2xl border border-card-border">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">1</span>
                  <span>Launch a session and share the PIN with participants</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">2</span>
                  <span>Start collecting and participants submit their interests</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">3</span>
                  <span>AI processes and groups similar topics together</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">4</span>
                  <span>View the interactive word cloud of interests</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
