'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/app/header';
import { Cloud, ArrowLeft, Loader2, Lightbulb, Eye } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { InterestCloudConfig, InterestCloudActivity } from '@/lib/types';
import { interestCloudActivityConverter } from '@/firebase/converters';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  { label: 'Team interests', prompt: 'What topics interest you most?' },
  { label: 'Workshop topics', prompt: 'What would you like to learn more about?' },
  { label: 'Icebreaker', prompt: 'Share a hobby or passion of yours!' },
  { label: 'Brainstorming', prompt: 'What ideas do you have for our next project?' },
  { label: 'Feedback', prompt: 'What should we focus on improving?' },
  { label: 'Expectations', prompt: 'What do you hope to get out of this session?' },
];

export default function CreateInterestCloudPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('What topics interest you most?');
  const [maxSubmissions, setMaxSubmissions] = useState(3);
  const [allowMultipleRounds, setAllowMultipleRounds] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to create an activity.",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for your Interest Cloud.",
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

    setIsCreating(true);

    try {
      const config: InterestCloudConfig = {
        prompt: prompt.trim(),
        maxSubmissionsPerPlayer: maxSubmissions,
        allowMultipleRounds,
      };

      const activityData = {
        type: 'interest-cloud',
        title: title.trim(),
        description: description.trim() || undefined,
        hostId: user.uid,
        config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as unknown as InterestCloudActivity;

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(interestCloudActivityConverter),
        activityData
      );

      toast({
        title: 'Interest Cloud Created!',
        description: 'You can now launch a session.',
      });

      router.push(`/host/interest-cloud/${docRef.id}`);
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the activity. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
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
              <h1 className="text-4xl font-bold">Create Interest Cloud</h1>
              <p className="text-muted-foreground">Collect topics and interests from your audience</p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg rounded-2xl border border-card-border">
          <CardHeader>
            <CardTitle>Activity Details</CardTitle>
            <CardDescription>
              Configure your Interest Cloud session
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

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="prompt">Prompt for Participants *</Label>
                <FeatureTooltip
                  content="This is the question your audience will see. Make it clear and engaging!"
                  icon="tip"
                />
              </div>
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

              {/* Example prompts */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Need inspiration? Try these:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map(({ label, prompt: examplePrompt }) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setPrompt(examplePrompt)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="multipleRounds">Allow Multiple Rounds</Label>
                  <FeatureTooltip
                    content="When enabled, participants can add more responses after seeing the initial word cloud. Great for iterative brainstorming!"
                    icon="info"
                  />
                </div>
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

            {/* Participant Preview */}
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Participant Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-background border p-4 space-y-3">
                  <p className="text-lg font-medium">{prompt || 'Your prompt will appear here...'}</p>
                  <div className="space-y-2">
                    {Array.from({ length: Math.min(maxSubmissions, 3) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1 h-10 rounded-md border border-dashed bg-muted/50" />
                      </div>
                    ))}
                    {maxSubmissions > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {maxSubmissions - 3} more fields
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-4 border-t">
              <Button
                onClick={handleCreate}
                disabled={isCreating || !title.trim() || !prompt.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 h-5 w-5" /> Create Interest Cloud
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
