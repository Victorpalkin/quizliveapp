'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Trash2, Cloud, Pencil, BarChart3 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ThoughtsGatheringActivity, EvaluationActivity } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils/format-date';

type Activity = ThoughtsGatheringActivity | EvaluationActivity;

interface ActivityCardProps {
  activity: Activity;
  onDelete: (activityId: string) => void;
}

export function ActivityCard({ activity, onDelete }: ActivityCardProps) {
  const isEvaluation = activity.type === 'evaluation';
  const isThoughtsGathering = activity.type === 'thoughts-gathering';

  // Determine icon, colors, and routes based on activity type
  const Icon = isEvaluation ? BarChart3 : Cloud;
  const iconColor = isEvaluation ? 'text-orange-500' : 'text-blue-500';
  const gradientClass = isEvaluation
    ? 'from-orange-500 to-red-500'
    : 'from-blue-500 to-purple-500';
  const activityTypePath = isEvaluation ? 'evaluation' : 'thoughts-gathering';
  const activityLabel = isEvaluation ? 'Evaluation' : 'Thoughts Gathering';

  // Get config summary based on activity type
  const getConfigSummary = (): string => {
    if (isEvaluation) {
      const evaluationActivity = activity as EvaluationActivity;
      const metricsCount = evaluationActivity.config.metrics?.length || 0;
      return `${metricsCount} metric${metricsCount !== 1 ? 's' : ''}`;
    }
    if (isThoughtsGathering) {
      const cloudActivity = activity as ThoughtsGatheringActivity;
      const prompt = cloudActivity.config.prompt;
      if (prompt && prompt.length > 30) {
        return `"${prompt.substring(0, 30)}..."`;
      }
      return prompt ? `"${prompt}"` : '';
    }
    return '';
  };

  const configSummary = getConfigSummary();
  const dateDisplay = formatRelativeTime(activity.updatedAt || activity.createdAt);

  return (
    <Card variant="interactive" className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between p-6">
        <div className='flex-grow'>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            <CardTitle className="text-2xl font-semibold">{activity.title}</CardTitle>
          </div>
          <CardDescription className="text-base">
            {activityLabel}
            {configSummary && <span className="text-muted-foreground"> · {configSummary}</span>}
            {dateDisplay && <span className="text-muted-foreground"> · {dateDisplay}</span>}
          </CardDescription>
        </div>
        <div className='flex items-center gap-1'>
          <Button asChild variant="ghost" size="icon" title="Edit activity" className="hover:bg-muted rounded-lg">
            <Link href={`/host/${activityTypePath}/edit/${activity.id}`}>
              <Pencil className="h-5 w-5" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete activity" className="hover:bg-muted rounded-lg">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Delete this activity?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This action cannot be undone. This will permanently delete &apos;{activity.title}&apos;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(activity.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end gap-3 p-6 pt-0">
        <Button asChild variant="gradient" size="xl" className={`w-full bg-gradient-to-r ${gradientClass}`}>
          <Link href={`/host/${activityTypePath}/${activity.id}`}>
            <Gamepad2 className="mr-2 h-4 w-4" /> Launch Session
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
