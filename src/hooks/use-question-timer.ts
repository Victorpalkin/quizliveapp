import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { Player } from '@/lib/types';

// Timer synchronization constants
const AUTO_FINISH_DELAY_MS = 1500; // Delay before auto-finishing when all players answered

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
 * Simplified timer approach:
 * - Start countdown at full time limit
 * - Sync with server timestamp (questionStartTime) using local clock
 * - Auto-finish when all players answered (host only)
 * - Auto-finish when time expires (host only)
 *
 * Synchronization:
 * - All players receive the same questionStartTime from Firestore
 * - Each timer calculates elapsed time using local clock
 * - Grace period in Cloud Function handles network latency
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
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  // Count players who have answered (host only)
  // Memoize to avoid recalculating on every render
  const answeredPlayers = useMemo(() => {
    if (!players) return 0;
    return players.filter(p =>
      p.answers?.some(a => a.questionIndex === currentQuestionIndex)
    ).length;
  }, [players, currentQuestionIndex]);

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
        }, AUTO_FINISH_DELAY_MS);

        // Clean up timeout if effect re-runs or component unmounts
        return () => clearTimeout(timeoutId);
      }
    }
  }, [players, answeredPlayers, isActive, onAutoFinish]);

  // Simplified timer - starts at full time limit
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      // Calculate initial time (sync with server timestamp)
      let initialTime = timeLimit;

      if (questionStartTime) {
        const questionStartMillis = questionStartTime.toMillis();
        const nowMillis = Date.now(); // Use local clock only
        const elapsedMillis = nowMillis - questionStartMillis;
        // Use Math.round instead of Math.floor for fairer distribution around typical latency
        // This centers the variance: 0-499ms→0s, 500-1499ms→1s, 1500-2499ms→2s
        const elapsedSeconds = Math.round(elapsedMillis / 1000);

        if (elapsedSeconds >= 0 && elapsedSeconds < timeLimit) {
          initialTime = Math.max(0, timeLimit - elapsedSeconds);
          console.log(`[Timer] Initial time: ${initialTime}s (elapsed: ${elapsedSeconds}s)`);
        } else if (elapsedSeconds < 0) {
          console.warn(`[Timer] Question not started yet, using full time`);
          initialTime = timeLimit;
        } else {
          console.warn(`[Timer] Time already expired (elapsed: ${elapsedSeconds}s), starting at 0`);
          initialTime = 0;
        }
      }

      setTime(initialTime);

      // Start countdown immediately
      countdownIntervalRef.current = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
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

      // Cleanup function
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
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
