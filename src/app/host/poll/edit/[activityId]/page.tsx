'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/app/header';
import { Vote, ArrowLeft } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { PollActivity } from '@/lib/types';
import { pollActivityConverter } from '@/firebase/converters';
import { PollForm, type PollFormData } from '@/components/app/poll-form';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function EditPollPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const activityId = params.activityId as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(pollActivityConverter) as DocumentReference<PollActivity>,
    [firestore, activityId]
  );
  const { data: poll, loading: pollLoading } = useDoc(activityRef);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  // Check ownership
  useEffect(() => {
    if (!pollLoading && poll && user) {
      if (poll.hostId !== user.uid) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You can only edit polls that you created.",
        });
        router.push('/host');
      }
    }
  }, [poll, pollLoading, user, toast, router]);

  const handleSubmit = async (data: PollFormData) => {
    if (!user || !poll) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save changes. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateDoc(doc(firestore, 'activities', activityId), {
        title: data.title,
        description: data.description || null,
        questions: data.questions,
        config: data.config,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Poll Updated!',
        description: 'Your changes have been saved.',
      });

      router.push(`/host/poll/${activityId}`);
    } catch (error) {
      console.error('Error updating poll:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save changes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || pollLoading) {
    return <FullPageLoader />;
  }

  if (!poll) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">Poll Not Found</h2>
          <Button asChild>
            <Link href="/host">Return to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const initialData: PollFormData = {
    title: poll.title,
    description: poll.description,
    config: poll.config,
    questions: poll.questions,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/host/poll/${activityId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Poll
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Vote className="h-10 w-10 text-teal-500" />
            <div>
              <h1 className="text-4xl font-bold">Edit Poll</h1>
              <p className="text-muted-foreground">Update your poll settings and questions</p>
            </div>
          </div>
        </div>

        <PollForm
          mode="edit"
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
}
