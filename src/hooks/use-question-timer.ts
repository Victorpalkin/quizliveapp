import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Timestamp, Firestore } from 'firebase/firestore';
import type { Player } from '@/lib/types';
import {
  calculateClockOffset,
  calculateTimeRemaining,
  detectDrift,
  isOffsetReasonable
} from '@/lib/utils/clock-sync';

// Timer synchronization constants
const AUTO_FINISH_DELAY_MS = 1500; // Delay before auto-finishing when all players answered

interface UseQuestionTimerOptions {
  timeLimit: number;
  questionStartTime: Timestamp | undefined;
  currentQuestionIndex: number;
  isActive?: boolean;
  players?: Player[];
  onAutoFinish?: () => void;
  firestore?: Firestore; // Optional: enables clock sync if provided
  enableClockSync?: boolean; // Optional: enable/disable clock sync (default: true if firestore provided)
  initialClockOffset?: number; // Optional: pre-calculated offset (e.g., from lobby)
}

/**
 * Shared question timer hook for both host and player views
 *
 * Simplified approach for reliability:
 * - Start countdown immediately (no blocking on async operations)
 * - Sync with server timestamp using cached offset
 * - Background clock sync (non-blocking, single sample)
 * - Periodic drift correction (every 5s, 1s threshold)
 * - Auto-finish when all players answered (host only)
 * - Auto-finish when time expires (host only)
 *
 * Why simplified:
 * - Timer must tick immediately for good UX
 * - Complex multi-sample sync was blocking countdown start
 * - Single sample is fast (~100-200ms) and accurate enough
 * - Relaxed thresholds prevent unnecessary corrections
 */
export function useQuestionTimer({
  timeLimit,
  questionStartTime,
  currentQuestionIndex,
  isActive = true,
  players,
  onAutoFinish,
  firestore,
  enableClockSync = true,
  initialClockOffset = 0, // Optional: pre-calculated offset from lobby
}: UseQuestionTimerOptions) {
  const [time, setTime] = useState(timeLimit);
  const finishedRef = useRef(false);
  const clockOffsetRef = useRef<number>(initialClockOffset); // Use pre-calculated offset if provided
  const offsetReadyRef = useRef(initialClockOffset !== 0); // Already synced if initial offset provided
  const driftCheckIntervalRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const timeRef = useRef(time); // Track current time for drift detection

  // Keep timeRef in sync with time state
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // Determine if we should use clock sync
  const useClockSync = enableClockSync && firestore && questionStartTime;

  // Simplified: No pre-calculation, just keep offset from last sync
  // This avoids blocking and keeps timer simple

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

  // Simplified timer with optional clock sync
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      // Calculate initial time (sync with server timestamp)
      let initialTime = timeLimit;

      if (questionStartTime) {
        const questionStartMillis = questionStartTime.toMillis();
        const nowMillis = Date.now() + clockOffsetRef.current; // Use cached offset
        const elapsedMillis = nowMillis - questionStartMillis;
        const elapsedSeconds = Math.floor(elapsedMillis / 1000);

        if (elapsedSeconds >= 0 && elapsedSeconds < timeLimit) {
          initialTime = Math.max(0, timeLimit - elapsedSeconds);
          console.log(`[Timer] Initial time: ${initialTime}s (elapsed: ${elapsedSeconds}s, offset: ${clockOffsetRef.current.toFixed(0)}ms)`);
        } else if (elapsedSeconds < 0) {
          console.warn(`[Timer] Question not started yet, using full time`);
          initialTime = timeLimit;
        } else {
          console.warn(`[Timer] Time already expired (elapsed: ${elapsedSeconds}s), starting at 0`);
          initialTime = 0;
        }
      }

      setTime(initialTime);

      // Start countdown immediately (don't wait for async operations)
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

      // Background: Sync clock offset once per question (non-blocking)
      if (useClockSync && firestore && !offsetReadyRef.current) {
        offsetReadyRef.current = true; // Mark as syncing to avoid duplicate calls

        // Single-sample sync (fast, ~100-200ms)
        calculateClockOffset(firestore, 1).then(offset => {
          if (isOffsetReasonable(offset)) {
            const oldOffset = clockOffsetRef.current;
            clockOffsetRef.current = offset;

            // Adjust current time if offset changed significantly (>1 second)
            if (Math.abs(offset - oldOffset) > 1000) {
              const correctTime = calculateTimeRemaining(
                questionStartTime!.toMillis(),
                timeLimit,
                offset
              );
              console.log(`[Timer] Offset updated: ${oldOffset.toFixed(0)}ms → ${offset.toFixed(0)}ms, adjusting time: ${timeRef.current}s → ${correctTime}s`);
              setTime(correctTime);
            } else {
              console.log(`[Timer] Offset synced: ${offset.toFixed(0)}ms (no adjustment needed)`);
            }
          }
        }).catch(error => {
          console.error('[Timer] Clock sync failed:', error);
        });
      }

      // Periodic drift check (every 5 seconds, relaxed threshold)
      if (useClockSync && questionStartTime) {
        driftCheckIntervalRef.current = setInterval(() => {
          const drift = detectDrift(
            timeRef.current,
            questionStartTime.toMillis(),
            timeLimit,
            clockOffsetRef.current,
            1.0 // 1 second threshold (relaxed from 0.2s)
          );

          if (drift.hasDrift) {
            console.warn(`[Timer] Auto-correcting drift: ${timeRef.current}s → ${drift.correctTime}s`);
            setTime(drift.correctTime);
          }
        }, 5000); // Check every 5 seconds
      }

      // Cleanup function
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        if (driftCheckIntervalRef.current) {
          clearInterval(driftCheckIntervalRef.current);
        }
        // Reset offset ready flag for next question
        offsetReadyRef.current = false;
      };
    }
  }, [currentQuestionIndex, isActive, timeLimit, questionStartTime, onAutoFinish, useClockSync, firestore]);

  // Handle tab backgrounding / device sleep - re-sync when tab becomes visible
  useEffect(() => {
    if (!useClockSync || !isActive || !questionStartTime || !firestore) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Timer] Tab became visible, re-syncing...');

        // Background sync (non-blocking)
        calculateClockOffset(firestore, 1).then(offset => {
          if (isOffsetReasonable(offset)) {
            clockOffsetRef.current = offset;
            const correctTime = calculateTimeRemaining(
              questionStartTime.toMillis(),
              timeLimit,
              offset
            );
            console.log(`[Timer] Re-synced: ${correctTime}s (offset: ${offset.toFixed(0)}ms)`);
            setTime(correctTime);
          }
        }).catch(error => {
          console.error('[Timer] Re-sync failed:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [useClockSync, isActive, questionStartTime, timeLimit, firestore]);

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
