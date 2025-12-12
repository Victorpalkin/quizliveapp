'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/app/header';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Target,
  Scale,
  Vote,
  Cloud,
  MessageSquare,
} from 'lucide-react';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, DocumentReference, Query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { EvaluationActivity, EvaluationMetric, EvaluationConfig, PredefinedItem, TopicCloudResult, ThoughtSubmission, ThoughtsGatheringActivity } from '@/lib/types';
import { evaluationActivityConverter, thoughtsGatheringActivityConverter, thoughtSubmissionConverter } from '@/firebase/converters';
import { nanoid } from 'nanoid';
import { removeUndefined } from '@/lib/firestore-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_METRIC: () => EvaluationMetric = () => ({
  id: nanoid(8),
  name: '',
  description: '',
  scaleType: 'stars',
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: [],
  weight: 1,
  lowerIsBetter: false,
});

interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  metrics: Omit<EvaluationMetric, 'id'>[];
}

const EVALUATION_TEMPLATES: EvaluationTemplate[] = [
  {
    id: 'impact-effort',
    name: 'Impact/Effort Matrix',
    description: 'Prioritize by impact vs. effort - great for project planning',
    icon: <Target className="h-5 w-5 text-green-500" />,
    metrics: [
      { name: 'Impact', description: 'How much value will this deliver?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
      { name: 'Effort', description: 'How much work is required?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: true },
    ],
  },
  {
    id: 'priority',
    name: 'Simple Priority',
    description: 'Single metric ranking by importance',
    icon: <BarChart3 className="h-5 w-5 text-orange-500" />,
    metrics: [
      { name: 'Priority', description: 'How important is this?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'feasibility',
    name: 'Importance + Feasibility',
    description: 'Balance desirability with practicality',
    icon: <Scale className="h-5 w-5 text-blue-500" />,
    metrics: [
      { name: 'Importance', description: 'How important is this to achieve?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1.5, lowerIsBetter: false },
      { name: 'Feasibility', description: 'How realistic is it to accomplish?', scaleType: 'stars', scaleMin: 1, scaleMax: 5, scaleLabels: [], weight: 1, lowerIsBetter: false },
    ],
  },
  {
    id: 'voting',
    name: 'Dot Voting',
    description: 'Simple yes/no voting for quick decisions',
    icon: <Vote className="h-5 w-5 text-purple-500" />,
    metrics: [
      { name: 'Vote', description: 'Do you support this?', scaleType: 'labels', scaleMin: 1, scaleMax: 2, scaleLabels: ['No', 'Yes'], weight: 1, lowerIsBetter: false },
    ],
  },
];

interface SelectableItem {
  id: string;
  text: string;
  count?: number; // For topics
  selected: boolean;
}

function CreateEvaluationFromThoughtsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  // URL params
  const activityId = searchParams.get('activityId') || '';
  const gameId = searchParams.get('gameId') || '';
  const initialSource = searchParams.get('source') as 'topics' | 'submissions' | null;

  // Form state
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

  // Fetch source activity
  const sourceActivityRef = useMemoFirebase(
    () => activityId
      ? doc(firestore, 'activities', activityId).withConverter(thoughtsGatheringActivityConverter) as DocumentReference<ThoughtsGatheringActivity>
      : null,
    [firestore, activityId]
  );
  const { data: sourceActivity, loading: activityLoading } = useDoc(sourceActivityRef);

  // Fetch topics from game aggregates
  const topicsRef = useMemoFirebase(
    () => gameId
      ? doc(firestore, 'games', gameId, 'aggregates', 'topics') as DocumentReference<TopicCloudResult>
      : null,
    [firestore, gameId]
  );
  const { data: topicCloud, loading: topicsLoading } = useDoc(topicsRef);

  // Fetch raw submissions
  const submissionsQuery = useMemoFirebase(
    () => gameId
      ? collection(firestore, 'games', gameId, 'submissions').withConverter(thoughtSubmissionConverter) as Query<ThoughtSubmission>
      : null,
    [firestore, gameId]
  );
  const { data: submissions, loading: submissionsLoading } = useCollection<ThoughtSubmission>(submissionsQuery);

  // Initialize title from source activity
  useEffect(() => {
    if (sourceActivity && !title) {
      setTitle(`Evaluation: ${sourceActivity.title}`);
    }
  }, [sourceActivity, title]);

  // Initialize items when source data loads
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

  // Apply a template
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

  const addMetric = () => {
    if (metrics.length >= 5) {
      toast({
        variant: "destructive",
        title: "Maximum metrics reached",
        description: "You can have up to 5 metrics per activity.",
      });
      return;
    }
    setMetrics([...metrics, DEFAULT_METRIC()]);
  };

  const removeMetric = (index: number) => {
    if (metrics.length <= 1) {
      toast({
        variant: "destructive",
        title: "At least one metric required",
        description: "You need at least one metric for evaluation.",
      });
      return;
    }
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, updates: Partial<EvaluationMetric>) => {
    setMetrics(metrics.map((m, i) => i === index ? { ...m, ...updates } : m));
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
        description: "Please enter a title for your Evaluation activity.",
      });
      return;
    }

    if (metrics.length === 0) {
      toast({
        variant: "destructive",
        title: "Metrics required",
        description: "Please select a template or add at least one metric.",
      });
      return;
    }

    const invalidMetrics = metrics.filter(m => !m.name.trim());
    if (invalidMetrics.length > 0) {
      toast({
        variant: "destructive",
        title: "Metric names required",
        description: "Please enter a name for each metric.",
      });
      return;
    }

    if (selectedItemsCount === 0) {
      toast({
        variant: "destructive",
        title: "No items selected",
        description: "Please select at least one item to evaluate.",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Build predefined items from selection
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
        // Source tracking
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the activity. Please try again.",
      });
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

              {/* Items Selection */}
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
              <CardDescription>
                Configure your Evaluation session
              </CardDescription>
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

          {/* Quick Start Templates */}
          <Card className="shadow-lg rounded-2xl border border-card-border bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Choose a Metric Template</CardTitle>
              </div>
              <CardDescription>
                Select how participants will evaluate the items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EVALUATION_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-background hover:border-primary/50 hover:bg-muted/50 transition-colors text-left ${
                      metrics.length > 0 && metrics[0].name === template.metrics[0].name
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    <div className="mt-0.5">{template.icon}</div>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex gap-1 mt-1">
                        {template.metrics.map((m, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {m.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Configuration (if template applied, show editable version) */}
          {metrics.length > 0 && (
            <Card className="shadow-lg rounded-2xl border border-card-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <CardTitle>Metrics</CardTitle>
                      <CardDescription>
                        Customize your evaluation criteria
                      </CardDescription>
                    </div>
                    <FeatureTooltip
                      content="Metrics are the criteria participants use to rate items."
                      icon="info"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addMetric}
                    disabled={metrics.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Metric
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.map((metric, index) => (
                  <div key={metric.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Metric {index + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMetric(index)}
                        disabled={metrics.length <= 1}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={metric.name}
                          onChange={(e) => updateMetric(index, { name: e.target.value })}
                          placeholder="e.g., Impact, Effort, Risk"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Scale Type</Label>
                        <Select
                          value={metric.scaleType}
                          onValueChange={(value: 'stars' | 'numeric' | 'labels') =>
                            updateMetric(index, { scaleType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stars">Stars (1-5)</SelectItem>
                            <SelectItem value="numeric">Numeric (1-10)</SelectItem>
                            <SelectItem value="labels">Custom Labels</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        value={metric.description || ''}
                        onChange={(e) => updateMetric(index, { description: e.target.value })}
                        placeholder="Help text for participants"
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`lower-${metric.id}`}
                          checked={metric.lowerIsBetter}
                          onCheckedChange={(checked) => updateMetric(index, { lowerIsBetter: checked })}
                        />
                        <Label htmlFor={`lower-${metric.id}`} className="flex items-center gap-1">
                          {metric.lowerIsBetter ? (
                            <><ArrowDown className="h-3 w-3 text-green-500" /> Lower is better</>
                          ) : (
                            <><ArrowUp className="h-3 w-3 text-green-500" /> Higher is better</>
                          )}
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Participant Settings */}
          <Card className="shadow-lg rounded-2xl border border-card-border">
            <CardHeader>
              <CardTitle>Participant Settings</CardTitle>
              <CardDescription>
                Configure how participants can contribute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="allowItems">Allow Participant Item Submissions</Label>
                  <p className="text-sm text-muted-foreground">
                    Let participants suggest additional items to be evaluated
                  </p>
                </div>
                <Switch
                  id="allowItems"
                  checked={allowParticipantItems}
                  onCheckedChange={setAllowParticipantItems}
                />
              </div>

              {allowParticipantItems && (
                <>
                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                    <Label htmlFor="maxItems">Max Items per Participant</Label>
                    <Input
                      id="maxItems"
                      type="number"
                      min={1}
                      max={10}
                      value={maxItemsPerParticipant}
                      onChange={(e) => setMaxItemsPerParticipant(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="w-32"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireApproval">Require Host Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Review participant items before adding to evaluation
                      </p>
                    </div>
                    <Switch
                      id="requireApproval"
                      checked={requireApproval}
                      onCheckedChange={setRequireApproval}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="showSubmitter">Show Item Submitter</Label>
                      <p className="text-sm text-muted-foreground">
                        Display who submitted each item
                      </p>
                    </div>
                    <Switch
                      id="showSubmitter"
                      checked={showItemSubmitter}
                      onCheckedChange={setShowItemSubmitter}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Create Button */}
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
