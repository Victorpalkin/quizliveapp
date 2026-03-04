'use client';

import { useState, useEffect } from 'react';

interface UsePresentationTimerResult {
  timeRemaining: number;
  isExpired: boolean;
}

/**
 * Countdown timer hook that syncs with a server timestamp.
 * Both host and player use the same timerStartedAt from Firestore
 * to stay in sync regardless of when they start listening.
 */
export function usePresentationTimer(
  timerStartedAt: Date | null,
  timeLimit: number
): UsePresentationTimerResult {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

  useEffect(() => {
    if (!timerStartedAt || timeLimit <= 0) {
      setTimeRemaining(timeLimit);
      return;
    }

    const tick = () => {
      const elapsed = (Date.now() - timerStartedAt.getTime()) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeRemaining(Math.ceil(remaining));
    };

    // Initial tick
    tick();

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timerStartedAt, timeLimit]);

  return {
    timeRemaining,
    isExpired: timerStartedAt !== null && timeLimit > 0 && timeRemaining <= 0,
  };
}
