'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/app/header';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart3, ArrowLeft, Loader2, Cloud, MessageSquare } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, DocumentReference, Query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { EvaluationActivity, EvaluationMetric, EvaluationConfig, PredefinedItem, TopicCloudResult, ThoughtSubmission, ThoughtsGatheringActivity } from '@/lib/types';
import { evaluationActivityConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { nanoid } from 'nanoid';
import { removeUndefined } from '@/lib/firestore-utils';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EvaluationTemplatePicker,
  EvaluationMetricsEditor,
  EvaluationParticipantSettings,
} from '@/components/app/evaluation-form-fields';
import type { EvaluationTemplate } from '@/lib/constants/evaluation-templates';

interface SelectableItem {
  id: string;
  text: string;
  count?: number;
  selected: boolean;
}

function CreateEvaluationFromThoughtsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const activityId = searchParams.get('activityId') || '';
  const gameId = searchParams.get('gameId') || '';
  const initialSource = searchParams.get('source') as 'topics' | 'submissions' | null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [selectedSource, setSelectedSource] = useState<'topics' | 'submissions'>(initialSource || 'topics');
  const [selectableItems, setSelectableItems] = useState<SelectableItem[]>([]);
  const [allowParticipantItems, setAllowParticipantItems] = useState(false);
  const [maxItemsPerParticipant, setMaxItemsPerParticipant] = useState(3);
  const [requireApproval, setRequireApproval] = useState(true);
  const [showItemSubmitter, setShowItemSubmitter] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const sourceActivityRef = useMemoFirebase(
    () => activityId
      ? doc(firestore, 'activities', activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>
      : null,
    [firestore, activityId]
  );
  const { data: sourceActivity, loading: activityLoading } = useDoc(sourceActivityRef);

  const topicsRef = useMemoFirebase(
    () => gameId
      ? doc(firestore, 'games', gameId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult>
      : null,
    [firestore, gameId]
  );
  const { data: topicCloud, loading: topicsLoading } = useDoc(topicsRef);

  const submissionsQuery = useMemoFirebase(
    () => gameId
      ? collection(firestore, 'games', gameId, 'submissions').withConverter(thoughtSubmissionConverter) as Query<ThoughtSubmission>
      : null,
    [firestore, gameId]
  );
  const { data: submissions, loading: submissionsLoading } = useCollection<ThoughtSubmission>(submissionsQuery);

  useEffect(() => {
    if (sourceActivity && !title) {
      setTitle(`Evaluation: ${sourceActivity.title}`);
    }
  }, [sourceActivity, title]);

  useEffect(() => {
    if (selectedSource === 'topics' && topicCloud?.topics) {
      const items: SelectableItem[] = topicCloud.topics.map(topic => ({
        id: nanoid(8),
        text: topic.topic,
        count: topic.count,
        selected: true,
      }));
      setSelectableItems(items);
    } else if (selectedSource === 'submissions' && submissions) {
      const items: SelectableItem[] = submissions.map(sub => ({
        id: nanoid(8),
        text: sub.rawText,
        selected: true,
      }));
      setSelectableItems(items);
    }
  }, [selectedSource, topicCloud, submissions]);

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

  const toggleItemSelection = (itemId: string) => {
    setSelectableItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = () => {
    setSelectableItems(items => items.map(item => ({ ...item, selected: true })));
  };

  const deselectAllItems = () => {
    setSelectableItems(items => items.map(item => ({ ...item, selected: false })));
  };

  const selectedItemsCount = selectableItems.filter(i => i.selected).length;

  const handleCreate = async () => {
    if (!user) {
      showError("Not authenticated", "Please log in to create an activity.");
      return;
    }

    if (!title.trim()) {
      showError("Title required", "Please enter a title for your Evaluation activity.");
      return;
    }

    if (metrics.length === 0) {
      showError("Metrics required", "Please select a template or add at least one metric.");
      return;
    }

    const invalidMetrics = metrics.filter(m => !m.name.trim());
    if (invalidMetrics.length > 0) {
      showError("Metric names required", "Please enter a name for each metric.");
      return;
    }

    if (selectedItemsCount === 0) {
      showError("No items selected", "Please select at least one item to evaluate.");
      return;
    }

    setIsCreating(true);

    try {
      const predefinedItems: PredefinedItem[] = selectableItems
        .filter(item => item.selected)
        .map(item => ({
          id: nanoid(8),
          text: item.text,
        }));

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
        sourceActivityId: activityId,
        sourceGameId: gameId,
        sourceType: 'thoughts-gathering' as const,
      };

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(evaluationActivityConverter),
        removeUndefined(activityData) as unknown as EvaluationActivity
      );

      toast({
        title: 'Evaluation Activity Created!',
        description: `Created with ${selectedItemsCount} items from your Thoughts Gathering session.`,
      });

      router.push(`/host/evaluation/${docRef.id}`);
    } catch (error) {
      console.error('Error creating activity:', error);
      showError("Error", "Could not create the activity. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = userLoading || activityLoading || topicsLoading || submissionsLoading;

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!activityId || !gameId) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-2xl flex items-center justify-center">
          <Card className="text-center p-8">
            <CardTitle className="text-2xl mb-4">Missing Parameters</CardTitle>
            <CardDescription className="mb-6">
              Please navigate here from a Thoughts Gathering session.
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
            <Link href={`/host/thoughts-gathering/game/${gameId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Session
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cloud className="h-10 w-10 text-blue-500" />
              <BarChart3 className="h-5 w-5 text-orange-500 absolute -bottom-1 -right-1" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create Evaluation from Thoughts</h1>
              <p className="text-muted-foreground">
                Turn collected thoughts into prioritized items
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Source Selection */}
          <Card className="shadow-lg rounded-2xl border border-card-border">
            <CardHeader>
              <CardTitle>Source Data</CardTitle>
              <CardDescription>
                Choose which data to use as evaluation items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedSource} onValueChange={(v) => setSelectedSource(v as 'topics' | 'submissions')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="topics" className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Topics ({topicCloud?.topics?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="submissions" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Submissions ({submissions?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="topics">
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-extracted topics from the word cloud. Each topic represents grouped similar responses.
                  </p>
                </TabsContent>

                <TabsContent value="submissions">
                  <p className="text-sm text-muted-foreground mb-4">
                    Raw text submissions from participants (not grouped).
                  </p>
                </TabsContent>
              </Tabs>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Items ({selectedItemsCount} of {selectableItems.length})</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllItems}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAllItems}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {selectableItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No {selectedSource === 'topics' ? 'topics' : 'submissions'} available
                    </p>
                  ) : (
                    selectableItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                        <span className="flex-1">{item.text}</span>
                        {item.count !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {item.count}x
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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

          <EvaluationTemplatePicker
            onApply={applyTemplate}
            currentMetrics={metrics}
          />

          {metrics.length > 0 && (
            <EvaluationMetricsEditor
              metrics={metrics}
              onMetricsChange={setMetrics}
              onError={showError}
              showWeight={false}
              showTooltips={false}
            />
          )}

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
              disabled={isCreating || !title.trim() || metrics.length === 0 || selectedItemsCount === 0}
              className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 rounded-xl"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-5 w-5" /> Create Evaluation with {selectedItemsCount} Items
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateEvaluationFromThoughtsPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <CreateEvaluationFromThoughtsContent />
    </Suspense>
  );
}
