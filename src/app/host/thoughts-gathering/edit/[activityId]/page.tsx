'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/app/header';
import { Cloud, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { ThoughtsGatheringConfig, ThoughtsGatheringActivity } from '@/lib/types';
import { thoughtsGatheringActivityConverter } from '@/firebase/converters';
import { FullPageLoader } from '@/components/ui/full-page-loader';

export default function EditThoughtsGatheringPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState(3);
  const [allowMultipleRounds, setAllowMultipleRounds] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Initialize form with existing data
  useEffect(() => {
    if (activity && !isInitialized) {
      setTitle(activity.title);
      setDescription(activity.description || '');
      setPrompt(activity.config.prompt);
      setMaxSubmissions(activity.config.maxSubmissionsPerPlayer);
      setAllowMultipleRounds(activity.config.allowMultipleRounds);
      setIsInitialized(true);
    }
  }, [activity, isInitialized]);

  const handleSave = async () => {
    if (!user || !activityDocRef) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to edit this activity.",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for your Thoughts Gathering activity.",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a prompt for participants.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const config: ThoughtsGatheringConfig = {
        prompt: prompt.trim(),
        maxSubmissionsPerPlayer: maxSubmissions,
        allowMultipleRounds,
      };

      await updateDoc(activityDocRef, {
        title: title.trim(),
        description: description.trim() || null,
        config,
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
    } finally {
      setIsSaving(false);
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

  // Check ownership
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

        <Card className="shadow-lg rounded-2xl border border-card-border">
          <CardHeader>
            <CardTitle>Activity Details</CardTitle>
            <CardDescription>
              Configure your Thoughts Gathering session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Interests, Workshop Topics"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this activity..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt for Participants *</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What would you like participants to share?"
                rows={3}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                This is what participants will see when submitting their interests
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSubmissions">Max Submissions per Person</Label>
              <Input
                id="maxSubmissions"
                type="number"
                min={1}
                max={10}
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                How many topics can each participant submit (1-10)
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="multipleRounds">Allow Multiple Rounds</Label>
                <p className="text-sm text-muted-foreground">
                  Let participants submit more after viewing results
                </p>
              </div>
              <Switch
                id="multipleRounds"
                checked={allowMultipleRounds}
                onCheckedChange={setAllowMultipleRounds}
              />
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !prompt.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 rounded-xl"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
