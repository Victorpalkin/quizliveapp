'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Users, Play } from 'lucide-react';
import { GameHeader } from '@/components/app/game-header';
import { TipBanner, ReadinessChecklist } from '@/components/app/host-action-hint';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { ActivityType, Player } from '@/lib/types';

interface ReadinessItem {
  label: string;
  isReady: boolean;
  detail?: string;
}

interface LobbyLayoutProps {
  /** Game PIN */
  gamePin: string;
  /** Player count */
  playerCount: number;
  /** Activity type for header styling */
  activityType: ActivityType;
  /** Activity title */
  title?: string;
  /** Cancel handler */
  onCancel: () => void;
  /** Tip text shown in the banner */
  tipText: string;
  /** Readiness checklist items */
  readinessItems: ReadinessItem[];
  /** Players list */
  players: Player[] | null;
  /** Whether players are still loading */
  playersLoading: boolean;
  /** Whether game data is loading */
  gameLoading?: boolean;
  /** Label for the start button */
  startLabel: string;
  /** Description text in the start card */
  startDescription: string;
  /** Confirmation dialog title */
  startConfirmTitle: string;
  /** Confirmation dialog description */
  startConfirmDescription: string;
  /** Handler when start is confirmed */
  onStart: () => void;
  /** Extra content in the start card (e.g. poll settings badges) */
  startCardExtra?: React.ReactNode;
  /** Extra content below the main grid (e.g. SubmissionsPanel) */
  children?: React.ReactNode;
}

export function LobbyLayout({
  gamePin,
  playerCount,
  activityType,
  title,
  onCancel,
  tipText,
  readinessItems,
  players,
  playersLoading,
  gameLoading = false,
  startLabel,
  startDescription,
  startConfirmTitle,
  startConfirmDescription,
  onStart,
  startCardExtra,
  children,
}: LobbyLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Game Header with PIN, QR, and Cancel */}
          <GameHeader
            gamePin={gamePin}
            playerCount={playerCount}
            activityType={activityType}
            title={title}
            onCancel={onCancel}
            isLive={false}
          />

          {/* Tips and Readiness */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TipBanner>{tipText}</TipBanner>
            <ReadinessChecklist items={readinessItems} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players List - Takes 2 columns */}
            <Card className="lg:col-span-2 border border-card-border shadow-sm">
              <div className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">
                      {activityType === 'quiz' ? 'Players' : 'Participants'}
                    </CardTitle>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {playersLoading || gameLoading ? '...' : playerCount}
                  </span>
                </div>
              </div>
              <div className="px-6 pb-6">
                {playersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : playerCount === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for {activityType === 'quiz' ? 'players' : 'participants'} to join...
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {players?.map(player => (
                      <span
                        key={player.id}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
                      >
                        {player.name || 'Anonymous'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Start Card */}
            <Card className="border-2 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <CardTitle className="text-xl mb-2">Ready to Start?</CardTitle>
                  <CardDescription>{startDescription}</CardDescription>
                </div>

                {startCardExtra}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {startLabel}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl shadow-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-semibold">{startConfirmTitle}</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        {startConfirmDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onStart} className="rounded-xl">
                        {startLabel}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
