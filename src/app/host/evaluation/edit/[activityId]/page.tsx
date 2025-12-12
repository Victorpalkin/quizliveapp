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
import { Badge } from '@/components/ui/badge';
import { BarChart3, ArrowLeft, Loader2, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, ListPlus } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { EvaluationActivity, EvaluationMetric, EvaluationConfig, PredefinedItem } from '@/lib/types';
import { evaluationActivityConverter } from '@/firebase/converters';
import { removeUndefined } from '@/lib/firestore-utils';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { nanoid } from 'nanoid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [newItemText, setNewItemText] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
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

  // Initialize form with existing data
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
        description: "You need at least one metric for ranking.",
      });
      return;
    }
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, updates: Partial<EvaluationMetric>) => {
    setMetrics(metrics.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const addPredefinedItem = () => {
    if (!newItemText.trim()) return;

    // Build item without undefined values (Firestore rejects undefined)
    const newItem: PredefinedItem = {
      id: nanoid(8),
      text: newItemText.trim(),
    };

    // Only add description if it has content
    if (newItemDescription.trim()) {
      newItem.description = newItemDescription.trim();
    }

    setPredefinedItems([...predefinedItems, newItem]);
    setNewItemText('');
    setNewItemDescription('');
  };

  const removePredefinedItem = (id: string) => {
    setPredefinedItems(predefinedItems.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to save changes.",
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

    // Validate metrics
    const invalidMetrics = metrics.filter(m => !m.name.trim());
    if (invalidMetrics.length > 0) {
      toast({
        variant: "destructive",
        title: "Metric names required",
        description: "Please enter a name for each metric.",
      });
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

  // Check ownership
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

          {/* Metrics Configuration */}
          <Card className="shadow-lg rounded-2xl border border-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Metrics</CardTitle>
                  <CardDescription>
                    Define criteria for rating items (1-5 metrics)
                  </CardDescription>
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

                  {metric.scaleType === 'numeric' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Value</Label>
                        <Input
                          type="number"
                          value={metric.scaleMin}
                          onChange={(e) => updateMetric(index, { scaleMin: parseInt(e.target.value) || 1 })}
                          min={0}
                          max={metric.scaleMax - 1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Value</Label>
                        <Input
                          type="number"
                          value={metric.scaleMax}
                          onChange={(e) => updateMetric(index, { scaleMax: parseInt(e.target.value) || 10 })}
                          min={metric.scaleMin + 1}
                          max={100}
                        />
                      </div>
                    </div>
                  )}

                  {metric.scaleType === 'labels' && (
                    <div className="space-y-2">
                      <Label>Labels (comma-separated)</Label>
                      <Input
                        value={metric.scaleLabels?.join(', ') || ''}
                        onChange={(e) => {
                          const labels = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
                          updateMetric(index, {
                            scaleLabels: labels,
                            scaleMin: 1,
                            scaleMax: Math.max(labels.length, 2)
                          });
                        }}
                        placeholder="Low, Medium, High"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter 2-10 labels separated by commas
                      </p>
                    </div>
                  )}

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

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`weight-${metric.id}`}>Weight:</Label>
                      <Input
                        id={`weight-${metric.id}`}
                        type="number"
                        value={metric.weight}
                        onChange={(e) => updateMetric(index, { weight: parseFloat(e.target.value) || 1 })}
                        min={0.1}
                        max={10}
                        step={0.1}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Predefined Items */}
          <Card className="shadow-lg rounded-2xl border border-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Predefined Items</CardTitle>
                  <CardDescription>
                    Add items that will be available for ranking (optional)
                  </CardDescription>
                </div>
                <Badge variant="outline">{predefinedItems.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Item Form */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newItemText">Item Name</Label>
                  <Input
                    id="newItemText"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="e.g., Feature A, Project X"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addPredefinedItem()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newItemDesc">Description (optional)</Label>
                  <Textarea
                    id="newItemDesc"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Additional context for participants..."
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPredefinedItem}
                  disabled={!newItemText.trim()}
                >
                  <ListPlus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              {/* Items List */}
              {predefinedItems.length > 0 && (
                <div className="space-y-2">
                  {predefinedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground font-mono text-sm">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="font-medium">{item.text}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePredefinedItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {predefinedItems.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No items added yet. You can also add items during the session.
                </p>
              )}
            </CardContent>
          </Card>

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
                    Let participants suggest items to be ranked
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
                        Review participant items before adding to ranking
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

          {/* Save Button */}
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
