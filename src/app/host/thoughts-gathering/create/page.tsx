'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/app/header';
import { Cloud, ArrowLeft } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import Link from 'next/link';
import type { ThoughtsGatheringActivity } from '@/lib/types';
import { thoughtsGatheringActivityConverter } from '@/firebase/converters';
import { ActivityForm, type ActivityFormValues } from '../components/activity-form';

export default function CreateThoughtsGatheringPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // TODO: useUnsavedChangesWarning is no longer tracked here since form state moved to ActivityForm.
  // This is acceptable since the form is a dedicated create page.

  const handleCreate = async (values: ActivityFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to create an activity.",
      });
      return;
    }

    if (!values.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for your Thoughts Gathering activity.",
      });
      return;
    }

    try {
      const activityData = {
        type: 'thoughts-gathering',
        title: values.title,
        description: values.description || undefined,
        hostId: user.uid,
        config: values.config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as unknown as ThoughtsGatheringActivity;

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(thoughtsGatheringActivityConverter),
        activityData
      );

      toast({
        title: 'Thoughts Gathering Created!',
        description: 'You can now launch a session.',
      });

      router.push(`/host/thoughts-gathering/${docRef.id}`);
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the activity. Please try again.",
      });
    }
  };

  const initialValues: ActivityFormValues = {
    title: '',
    description: '',
    config: {
      prompt: 'What topics interest you most?',
      maxSubmissionsPerPlayer: 3,
      allowMultipleRounds: false,
      agenticUseCasesCollection: false,
      anonymousMode: false,
      enableModeration: false,
    },
  };

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
              <h1 className="text-4xl font-bold">Create Thoughts Gathering</h1>
              <p className="text-muted-foreground">Collect topics and ideas from your audience</p>
            </div>
          </div>
        </div>

        <ActivityForm
          initialValues={initialValues}
          onSubmit={handleCreate}
          submitLabel="Create Thoughts Gathering"
          submitIcon={<Cloud className="mr-2 h-5 w-5" />}
          loadingLabel="Creating..."
          showExamplePrompts
          showPreview
        />
      </main>
    </div>
  );
}
