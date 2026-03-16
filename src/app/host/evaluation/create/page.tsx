'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/app/header';
import { BarChart3, ArrowLeft, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import Link from 'next/link';
import type { EvaluationActivity, EvaluationMetric, EvaluationConfig, PredefinedItem } from '@/lib/types';
import { evaluationActivityConverter } from '@/firebase/converters';
import { nanoid } from 'nanoid';
import { removeUndefined } from '@/lib/firestore-utils';
import {
  DEFAULT_METRIC,
  EvaluationTemplatePicker,
  EvaluationMetricsEditor,
  EvaluationPredefinedItemsEditor,
  EvaluationParticipantSettings,
} from '@/components/app/evaluation-form-fields';
import type { EvaluationTemplate } from '@/lib/constants/evaluation-templates';

export default function CreateEvaluationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([DEFAULT_METRIC()]);
  const [predefinedItems, setPredefinedItems] = useState<PredefinedItem[]>([]);
  const [allowParticipantItems, setAllowParticipantItems] = useState(false);
  const [maxItemsPerParticipant, setMaxItemsPerParticipant] = useState(3);
  const [requireApproval, setRequireApproval] = useState(true);
  const [showItemSubmitter, setShowItemSubmitter] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const hasUnsavedChanges = title.trim() !== '' ||
    description.trim() !== '' ||
    metrics.length > 1 ||
    (metrics.length === 1 && metrics[0].name.trim() !== '') ||
    predefinedItems.length > 0;
  useUnsavedChangesWarning(hasUnsavedChanges && !isCreating);

  const applyTemplate = (template: EvaluationTemplate) => {
    const metricsWithIds = template.metrics.map(m => ({
      ...m,
      id: nanoid(8),
    }));
    setMetrics(metricsWithIds);
    toast({
      title: `Template Applied: ${template.name}`,
      description: `${template.metrics.length} metric(s) configured.`,
    });
  };

  const showError = (title: string, description: string) => {
    toast({ variant: "destructive", title, description });
  };

  const handleCreate = async () => {
    if (!user) {
      showError("Not authenticated", "Please log in to create an activity.");
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

    setIsCreating(true);

    try {
      const config: EvaluationConfig = {
        metrics: removeUndefined(metrics),
        predefinedItems,
        allowParticipantItems,
        maxItemsPerParticipant,
        requireApproval,
        showItemSubmitter,
      };

      const activityData = {
        type: 'evaluation' as const,
        title: title.trim(),
        description: description.trim() || undefined,
        hostId: user.uid,
        config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(evaluationActivityConverter),
        removeUndefined(activityData) as unknown as EvaluationActivity
      );

      toast({
        title: 'Evaluation Activity Created!',
        description: 'You can now launch a session.',
      });

      router.push(`/host/evaluation/${docRef.id}`);
    } catch (error) {
      console.error('Error creating activity:', error);
      showError("Error", "Could not create the activity. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

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
            <BarChart3 className="h-10 w-10 text-orange-500" />
            <div>
              <h1 className="text-4xl font-bold">Create Evaluation Activity</h1>
              <p className="text-muted-foreground">Collect and prioritize items with your audience</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <EvaluationTemplatePicker onApply={applyTemplate} prominent />

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
              onClick={handleCreate}
              disabled={isCreating || !title.trim() || metrics.some(m => !m.name.trim())}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 rounded-xl"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-5 w-5" /> Create Evaluation Activity
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
