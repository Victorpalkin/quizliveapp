'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/app/header';
import { Cloud, ArrowLeft, Save } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { ThoughtsGatheringActivity } from '@/lib/types';
import { thoughtsGatheringActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { ActivityForm, type ActivityFormValues } from '../../components/activity-form';

export default function EditThoughtsGatheringPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  // Fetch existing activity
  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>,
    [firestore, activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  // Plain ref for updates
  const activityDocRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId),
    [firestore, activityId]
  );

  const handleSave = async (values: ActivityFormValues) => {
    if (!user || !activityDocRef) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to edit this activity.",
      });
      return;
    }

    try {
      await updateDoc(activityDocRef, {
        title: values.title,
        description: values.description || null,
        config: values.config,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Changes Saved!',
        description: 'Your Thoughts Gathering activity has been updated.',
      });

      router.push(`/host/thoughts-gathering/${activityId}`);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save changes. Please try again.",
      });
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
              This activity may have been deleted or you don&apos;t have access to it.
            </CardDescription>
            <Button asChild>
              <Link href="/host">Back to Dashboard</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  if (activity.hostId !== user?.uid) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl flex items-center justify-center">
          <Card className="text-center p-8">
            <CardTitle className="text-2xl mb-4">Access Denied</CardTitle>
            <CardDescription className="mb-6">
              You don&apos;t have permission to edit this activity.
            </CardDescription>
            <Button asChild>
              <Link href="/host">Back to Dashboard</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const initialValues: ActivityFormValues = {
    title: activity.title,
    description: activity.description || '',
    config: {
      prompt: activity.config.prompt,
      maxSubmissionsPerPlayer: activity.config.maxSubmissionsPerPlayer,
      allowMultipleRounds: activity.config.allowMultipleRounds,
      agenticUseCasesCollection: activity.config.agenticUseCasesCollection || false,
      anonymousMode: activity.config.anonymousMode || false,
      enableModeration: activity.config.enableModeration || false,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/host/thoughts-gathering/${activityId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Activity
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Cloud className="h-10 w-10 text-blue-500" />
            <div>
              <h1 className="text-4xl font-bold">Edit Thoughts Gathering</h1>
              <p className="text-muted-foreground">Update your activity settings</p>
            </div>
          </div>
        </div>

        <ActivityForm
          initialValues={initialValues}
          onSubmit={handleSave}
          submitLabel="Save Changes"
          submitIcon={<Save className="mr-2 h-5 w-5" />}
          loadingLabel="Saving..."
        />
      </main>
    </div>
  );
}
