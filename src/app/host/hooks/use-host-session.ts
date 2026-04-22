'use client';

import { useEffect } from 'react';
import { saveHostSession, clearHostSession } from '@/lib/host-session';
import type { ActivityType } from '@/lib/types';

interface UseHostSessionConfig {
  gameId: string;
  game: { gamePin: string; state: string; activityId?: string; quizId?: string } | null;
  contentId: string;
  contentTitle: string;
  userId: string | undefined;
  activityType: ActivityType;
  returnPath: string;
}

/**
 * Manages host session lifecycle — saves session when game is active, clears when ended.
 * Replaces the duplicated two-useEffect pattern across all host game/lobby pages.
 */
export function useHostSession({
  gameId,
  game,
  contentId,
  contentTitle,
  userId,
  activityType,
  returnPath,
}: UseHostSessionConfig) {
  // Save session when game is loaded and active
  useEffect(() => {
    if (game && contentTitle && userId && game.state !== 'ended') {
      saveHostSession(
        gameId,
        game.gamePin,
        contentId,
        contentTitle,
        userId,
        activityType,
        game.state,
        returnPath,
      );
    }
  }, [gameId, game, contentId, contentTitle, userId, activityType, returnPath, game?.state]);

  // Clear session when game ends
  useEffect(() => {
    if (game?.state === 'ended') {
      clearHostSession();
    }
  }, [game?.state]);
}
