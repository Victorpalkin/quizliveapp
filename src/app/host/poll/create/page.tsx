'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/app/header';
import { Vote, ArrowLeft } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { pollActivityConverter } from '@/firebase/converters';
import { PollForm, type PollFormData } from '@/components/app/poll-form';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function CreatePollPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (data: PollFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to create a poll.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const activityData = {
        type: 'poll' as const,
        title: data.title,
        description: data.description,
        hostId: user.uid,
        questions: data.questions,
        config: data.config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(pollActivityConverter),
        activityData as any
      );

      toast({
        title: 'Poll Created!',
        description: 'You can now launch a session.',
      });

      router.push(`/host/poll/${docRef.id}`);
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the poll. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/host">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Vote className="h-10 w-10 text-teal-500" />
            <div>
              <h1 className="text-4xl font-bold">Create Poll</h1>
              <p className="text-muted-foreground">Gather opinions from your audience</p>
            </div>
          </div>
        </div>

        <PollForm
          mode="create"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
}
