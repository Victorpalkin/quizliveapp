'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, DocumentReference, Timestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { evaluationActivityConverter } from '@/firebase/converters';
import type { EvaluationActivity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { DetailPageLayout } from '../../components/detail-page-layout';

export default function EvaluationDetailPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [isLaunching, setIsLaunching] = useState(false);

  const activityRef = useMemoFirebase(
    () => doc(firestore, 'activities', activityId).withConverter(evaluationActivityConverter) as DocumentReference<EvaluationActivity>,
    [firestore, activityId]
  );
  const { data: activity, loading: activityLoading } = useDoc(activityRef);

  const handleLaunchSession = async () => {
    if (!user || !activity) return;

    setIsLaunching(true);

    try {
      const gameData = {
        activityType: 'evaluation' as const,
        activityId: activityId,
        quizId: '',
        hostId: user.uid,
        state: 'collecting' as const,
        currentQuestionIndex: 0,
        gamePin: nanoid(8).toUpperCase(),
        createdAt: serverTimestamp(),
        itemSubmissionsOpen: activity.config.allowParticipantItems,
      };

      const gameDoc = await addDoc(collection(firestore, 'games'), gameData);

      if (activity.config.predefinedItems && activity.config.predefinedItems.length > 0) {
        const batch = writeBatch(firestore);
        const itemsCollection = collection(firestore, 'games', gameDoc.id, 'items');

        activity.config.predefinedItems.forEach((item, index) => {
          const itemRef = doc(itemsCollection);
          batch.set(itemRef, {
            text: item.text,
            description: item.description || null,
            isHostItem: true,
            approved: true,
            order: index + 1,
            createdAt: Timestamp.now(),
          });
        });

        await batch.commit();
      }

      toast({
        title: 'Session Started!',
        description: activity.config.predefinedItems?.length
          ? `${activity.config.predefinedItems.length} items added. Invite participants to join.`
          : 'Add items and invite participants to join.',
      });

      router.push(`/host/evaluation/game/${gameDoc.id}`);
    } catch (error) {
      console.error('Error launching session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not launch the session. Please try again.",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const getScaleLabel = (metric: EvaluationActivity['config']['metrics'][0]) => {
    if (metric.scaleType === 'stars') return `${metric.scaleMin}-${metric.scaleMax} stars`;
    if (metric.scaleType === 'numeric') return `${metric.scaleMin}-${metric.scaleMax}`;
    if (metric.scaleType === 'labels' && metric.scaleLabels?.length) {
      return metric.scaleLabels.join(' → ');
    }
    return '';
  };

  return (
    <DetailPageLayout
      activityType="evaluation"
      title={activity?.title || ''}
      subtitle="Evaluation Activity"
      isLaunching={isLaunching}
      onLaunch={handleLaunchSession}
      launchDescription="Launch a live session to collect and rank items with your audience"
      loading={userLoading || activityLoading}
      notFound={!activity && !activityLoading}
      notFoundLabel="Activity"
    >
      {/* Metrics Card */}
      <Card className="shadow-md rounded-2xl border border-card-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Metrics ({activity?.config.metrics.length})</CardTitle>
              <CardDescription>Criteria participants will rate items on</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/host/evaluation/edit/${activityId}`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity?.config.metrics.map((metric) => (
            <div key={metric.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium">{metric.name}</span>
                {metric.lowerIsBetter ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <ArrowDown className="h-3 w-3 mr-1" /> Lower is better
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    <ArrowUp className="h-3 w-3 mr-1" /> Higher is better
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {getScaleLabel(metric)}
                {metric.weight !== 1 && <span className="ml-2">(weight: {metric.weight}x)</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Predefined Items Card */}
      {activity?.config.predefinedItems && activity.config.predefinedItems.length > 0 && (
        <Card className="shadow-md rounded-2xl border border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Predefined Items ({activity.config.predefinedItems.length})</CardTitle>
                <CardDescription>These items will be added when you launch a session</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/host/evaluation/edit/${activityId}`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.config.predefinedItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground font-mono text-sm">{index + 1}.</span>
                <div>
                  <p className="font-medium">{item.text}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Settings Card */}
      <Card className="shadow-md rounded-2xl border border-card-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity?.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{activity.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Participant Items</p>
              <p className="text-lg font-semibold">
                {activity?.config.allowParticipantItems ? 'Allowed' : 'Disabled'}
              </p>
            </div>
            {activity?.config.allowParticipantItems && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max per Person</p>
                  <p className="text-lg font-semibold">{activity?.config.maxItemsPerParticipant}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Require Approval</p>
                  <p className="text-lg font-semibold">{activity?.config.requireApproval ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Show Submitter</p>
                  <p className="text-lg font-semibold">{activity?.config.showItemSubmitter ? 'Yes' : 'No'}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </DetailPageLayout>
  );
}
