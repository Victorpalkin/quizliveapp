import { useState, useEffect, useCallback, useRef } from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { Player } from '@/lib/types';

interface UseQuestionTimerOptions {
  timeLimit: number;
  questionStartTime: Timestamp | undefined;
  currentQuestionIndex: number;
  isActive?: boolean;
  players?: Player[];
  onAutoFinish?: () => void;
}

/**
 * Shared question timer hook for both host and player views
 *
 * Features:
 * - Syncs timer with server timestamp
 * - Auto-finish when all players answered (host only)
 * - Auto-finish when time expires (host only)
 * - Race condition protection
 * - Countdown to 0
 */
export function useQuestionTimer({
  timeLimit,
  questionStartTime,
  currentQuestionIndex,
  isActive = true,
  players,
  onAutoFinish,
}: UseQuestionTimerOptions) {
  const [time, setTime] = useState(timeLimit);
  const finishedRef = useRef(false);

  // Count players who have answered (host only)
  const answeredPlayers = players?.filter(p =>
    p.answers?.some(a => a.questionIndex === currentQuestionIndex)
  ).length || 0;

  // Auto-finish when all players answered (host only)
  // Includes delay to allow in-flight answer submissions to complete
  useEffect(() => {
    if (isActive && !finishedRef.current && onAutoFinish && players && players.length > 0) {
      if (answeredPlayers === players.length) {
        console.log('[Timer] All players answered - delaying auto-finish by 1.5s for in-flight submissions');

        // Delay auto-finish to allow in-flight answers to reach the server
        const timeoutId = setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            console.log('[Timer] Auto-finishing after delay');
            onAutoFinish();
          }
        }, 1500); // 1.5 second delay

        // Clean up timeout if effect re-runs or component unmounts
        return () => clearTimeout(timeoutId);
      }
    }
  }, [players, answeredPlayers, isActive, onAutoFinish]);

  // Timer countdown
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      // Sync timer with questionStartTime
      let initialTime = timeLimit;
      if (questionStartTime) {
        const elapsedSeconds = Math.floor((Date.now() - questionStartTime.toMillis()) / 1000);
        initialTime = Math.max(0, timeLimit - elapsedSeconds);
        console.log(`[Timer] Syncing with server: elapsed=${elapsedSeconds}s, remaining=${initialTime}s`);
      }
      setTime(initialTime);

      const timer = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-finish on timeout (host only)
            if (onAutoFinish && !finishedRef.current) {
              finishedRef.current = true;
              onAutoFinish();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestionIndex, isActive, timeLimit, questionStartTime, onAutoFinish]);

  // Reset timer function (player only)
  const resetTimer = useCallback(() => {
    setTime(timeLimit);
  }, [timeLimit]);

  return {
    time,
    answeredPlayers,
    resetTimer
  };
}
