'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Eye, BarChart3, Gamepad2, RotateCcw } from 'lucide-react';
import { ACTIVITY_CONFIG } from '@/lib/activity-config';
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
import type { Game, ActivityType } from '@/lib/types';

// Completed-game-specific config (extends shared ACTIVITY_CONFIG)
const COMPLETED_CONFIG: Record<string, {
  reopenPath: ((gameId: string) => string) | null;
  resultsPath: (gameId: string) => string;
  hostAgainPath: ((game: Game) => string | null) | null;
}> = {
  quiz: {
    reopenPath: null,
    resultsPath: (gameId) => `/host/quiz/game/${gameId}`,
    hostAgainPath: null,
  },
  poll: {
    reopenPath: null,
    resultsPath: (gameId) => `/host/poll/game/${gameId}`,
    hostAgainPath: (game) => game.activityId ? `/host/poll/${game.activityId}` : null,
  },
  'thoughts-gathering': {
    reopenPath: null,
    resultsPath: (gameId) => `/host/thoughts-gathering/game/${gameId}`,
    hostAgainPath: (game) => game.activityId ? `/host/thoughts-gathering/${game.activityId}` : null,
  },
  evaluation: {
    reopenPath: (gameId) => `/host/evaluation/game/${gameId}`,
    resultsPath: (gameId) => `/host/evaluation/game/${gameId}`,
    hostAgainPath: null,
  },
  presentation: {
    reopenPath: null,
    resultsPath: (gameId) => `/host/presentation/present/${gameId}`,
    hostAgainPath: null,
  },
};

interface CompletedActivityCardProps {
  game: Game;
  title: string;
  onDelete: (gameId: string) => void;
  onHostAgain?: (id: string) => void;
}

export function CompletedActivityCard({ game, title, onDelete, onHostAgain }: CompletedActivityCardProps) {
  const router = useRouter();
  const activityType = (game.activityType || 'quiz') as ActivityType;
  const sharedConfig = ACTIVITY_CONFIG[activityType] || ACTIVITY_CONFIG.quiz;
  const completedConfig = COMPLETED_CONFIG[activityType] || COMPLETED_CONFIG.quiz;

  const Icon = sharedConfig.icon;
  const analyticsPath = sharedConfig.analyticsPath?.(game.id);
  const reopenPath = completedConfig.reopenPath?.(game.id);
  const resultsPath = completedConfig.resultsPath(game.id);
  const hostAgainPath = completedConfig.hostAgainPath?.(game);

  // Determine if we should show "Host Again" button
  const showHostAgain = activityType === 'quiz' && onHostAgain && game.quizId;
  const showHostAgainLink = hostAgainPath != null;

  // Determine if we should show "Reopen Session" button
  const showReopen = reopenPath !== null;

  return (
    <Card variant="interactive" className="flex flex-col">
      <CardHeader className="p-4 pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon className={`h-3 w-3 ${sharedConfig.badgeClass.split(' ')[1]}`} />
            <CardTitle className="text-lg font-semibold font-mono tracking-widest">{game.gamePin}</CardTitle>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-semibold">Delete this record?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  This will permanently delete the record for &apos;{game.gamePin}&apos;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Back</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(game.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Yes, Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <CardDescription className="text-sm">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <div className="flex gap-2">
          {activityType !== 'presentation' && (
            <Button
              variant="gradient"
              className="flex-1"
              onClick={() => router.push(resultsPath)}
            >
              <Eye className="mr-2 h-4 w-4" /> Results
            </Button>
          )}
          {analyticsPath && (
            <Button asChild variant="gradient" className="flex-1">
              <Link href={analyticsPath}>
                <BarChart3 className="mr-2 h-4 w-4" /> Analytics
              </Link>
            </Button>
          )}
        </div>
        {showHostAgain && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onHostAgain!(game.quizId)}
          >
            <Gamepad2 className="mr-2 h-4 w-4" /> Host Again
          </Button>
        )}
        {showHostAgainLink && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={hostAgainPath!}>
              <Gamepad2 className="mr-2 h-4 w-4" /> Host Again
            </Link>
          </Button>
        )}
        {showReopen && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(reopenPath!)}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reopen Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
