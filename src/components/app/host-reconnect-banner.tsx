'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gamepad2, X, Loader2 } from 'lucide-react';
import { useHostSession } from '@/hooks/use-host-session';

/**
 * A banner that appears when the host has an active game session.
 * Allows quick reconnection to the game without navigating through the dashboard.
 */
export function HostReconnectBanner() {
  const router = useRouter();
  const { session, isValidating, clearSession, hasValidSession } = useHostSession();

  // Don't render anything while validating or if no valid session
  if (isValidating) {
    return null;
  }

  if (!hasValidSession() || !session) {
    return null;
  }

  const handleReconnect = () => {
    if (session.activityType === 'thoughts-gathering') {
      // Thoughts Gathering always goes to game page (no separate lobby)
      router.push(`/host/thoughts-gathering/game/${session.gameId}`);
    } else if (session.activityType === 'evaluation') {
      // Evaluation always goes to game page
      router.push(`/host/evaluation/game/${session.gameId}`);
    } else {
      // Quiz: route based on game state
      const path = session.gameState === 'lobby' ? '/host/quiz/lobby' : '/host/quiz/game';
      router.push(`${path}/${session.gameId}`);
    }
  };

  const handleDismiss = () => {
    clearSession();
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 mb-6">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              You have an active game!
            </p>
            <p className="text-sm text-muted-foreground">
              {session.quizTitle} - PIN: <span className="font-mono font-semibold">{session.gamePin}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReconnect}
            className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300"
          >
            <Gamepad2 className="mr-2 h-4 w-4" />
            Rejoin Game
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            title="Dismiss (will not end the game)"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * A full-screen reconnection overlay for when the host needs to reconnect urgently.
 * Used on the home page to immediately redirect hosts back to their game.
 */
export function HostReconnectOverlay() {
  const router = useRouter();
  const { session, isValidating, clearSession, hasValidSession } = useHostSession();

  // Don't render anything while validating or if no valid session
  if (isValidating) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Checking for active games...</p>
      </div>
    );
  }

  if (!hasValidSession() || !session) {
    return null;
  }

  const handleReconnect = () => {
    if (session.activityType === 'thoughts-gathering') {
      // Thoughts Gathering always goes to game page (no separate lobby)
      router.push(`/host/thoughts-gathering/game/${session.gameId}`);
    } else if (session.activityType === 'evaluation') {
      // Evaluation always goes to game page
      router.push(`/host/evaluation/game/${session.gameId}`);
    } else {
      // Quiz: route based on game state
      const path = session.gameState === 'lobby' ? '/host/quiz/lobby' : '/host/quiz/game';
      router.push(`${path}/${session.gameId}`);
    }
  };

  const handleDismiss = () => {
    clearSession();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30 shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back!
            </h2>
            <p className="text-muted-foreground">
              You have an active game in progress.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="font-semibold text-lg">{session.quizTitle}</p>
            <p className="text-sm text-muted-foreground">
              Game PIN: <span className="font-mono font-bold text-foreground">{session.gamePin}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleReconnect}
              size="lg"
              className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300"
            >
              <Gamepad2 className="mr-2 h-5 w-5" />
              Rejoin Game
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full"
            >
              Dismiss
            </Button>
            <p className="text-xs text-muted-foreground">
              Dismissing will not end the game. Players will still be waiting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
