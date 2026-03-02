'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/app/header';
import { BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { EvaluationActivity, EvaluationMetric, EvaluationConfig, PredefinedItem } from '@/lib/types';
import { evaluationActivityConverter } from '@/firebase/converters';
import { removeUndefined } from '@/lib/firestore-utils';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import {
  EvaluationMetricsEditor,
  EvaluationPredefinedItemsEditor,
  EvaluationParticipantSettings,
} from '@/components/app/evaluation-form-fields';

export default function EditEvaluationPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [predefinedItems, setPredefinedItems] = useState<PredefinedItem[]>([]);
  const [allowParticipantItems, setAllowParticipantItems] = useState(false);
  const [maxItemsPerParticipant, setMaxItemsPerParticipant] = useState(3);
  const [requireApproval, setRequireApproval] = useState(true);
  const [showItemSubmitter, setShowItemSubmitter] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(evaluationActivityConverter) as DocumentReference<EvaluationActivity>,
    [firestore, activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  useEffect(() => {
    if (activity && !isInitialized) {
      setTitle(activity.title);
      setDescription(activity.description || '');
      setMetrics(activity.config.metrics);
      setPredefinedItems(activity.config.predefinedItems || []);
      setAllowParticipantItems(activity.config.allowParticipantItems);
      setMaxItemsPerParticipant(activity.config.maxItemsPerParticipant);
      setRequireApproval(activity.config.requireApproval);
      setShowItemSubmitter(activity.config.showItemSubmitter);
      setIsInitialized(true);
    }
  }, [activity, isInitialized]);

  const showError = (title: string, description: string) => {
    toast({ variant: "destructive", title, description });
  };

  const handleSave = async () => {
    if (!user) {
      showError("Not authenticated", "Please log in to save changes.");
      return;
    }

    if (!title.trim()) {
      showError("Title required", "Please enter a title for your Evaluation activity.");
      return;
    }

    const invalidMetrics = metrics.filter(m => !m.name.trim());
    if (invalidMetrics.length > 0) {
      showError("Metric names required", "Please enter a name for each metric.");
      return;
    }

    setIsSaving(true);

    try {
      const config: EvaluationConfig = {
        metrics: removeUndefined(metrics),
        predefinedItems,
        allowParticipantItems,
        maxItemsPerParticipant,
        requireApproval,
        showItemSubmitter,
      };

      await updateDoc(activityRef, removeUndefined({
        title: title.trim(),
        description: description.trim() || null,
        config,
        updatedAt: serverTimestamp(),
      }));

      toast({
        title: 'Changes Saved!',
        description: 'Your evaluation activity has been updated.',
      });

      router.push(`/host/evaluation/${activityId}`);
    } catch (error) {
      console.error('Error saving activity:', error);
      showError("Error", "Could not save changes. Please try again.");
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
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl flex items-center justify-center">
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

  if (user && activity.hostId !== user.uid) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl flex items-center justify-center">
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
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/host/evaluation/${activityId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Activity
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-orange-500" />
            <div>
              <h1 className="text-4xl font-bold">Edit Evaluation Activity</h1>
              <p className="text-muted-foreground">Update your evaluation configuration</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="shadow-lg rounded-2xl border border-card-border">
            <CardHeader>
              <CardTitle>Activity Details</CardTitle>
              <CardDescription>Configure your Evaluation session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Feature Prioritization, Team Goals"
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context for participants..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <EvaluationMetricsEditor
            metrics={metrics}
            onMetricsChange={setMetrics}
            onError={showError}
          />

          <EvaluationPredefinedItemsEditor
            items={predefinedItems}
            onItemsChange={setPredefinedItems}
          />

          <EvaluationParticipantSettings
            allowParticipantItems={allowParticipantItems}
            onAllowParticipantItemsChange={setAllowParticipantItems}
            maxItemsPerParticipant={maxItemsPerParticipant}
            onMaxItemsPerParticipantChange={setMaxItemsPerParticipant}
            requireApproval={requireApproval}
            onRequireApprovalChange={setRequireApproval}
            showItemSubmitter={showItemSubmitter}
            onShowItemSubmitterChange={setShowItemSubmitter}
          />

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || metrics.some(m => !m.name.trim())}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-5 w-5" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
