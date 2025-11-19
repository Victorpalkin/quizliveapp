import { useState, useEffect, useCallback, useRef } from 'react';
import type { Timestamp, Firestore } from 'firebase/firestore';
import type { Player } from '@/lib/types';
import {
  calculateClockOffset,
  calculateTimeRemaining,
  detectDrift,
  isOffsetReasonable
} from '@/lib/utils/clock-sync';

interface UseQuestionTimerOptions {
  timeLimit: number;
  questionStartTime: Timestamp | undefined;
  currentQuestionIndex: number;
  isActive?: boolean;
  players?: Player[];
  onAutoFinish?: () => void;
  firestore?: Firestore; // Optional: enables clock sync if provided
  enableClockSync?: boolean; // Optional: enable/disable clock sync (default: true if firestore provided)
}

/**
 * Shared question timer hook for both host and player views
 *
 * Features:
 * - Hybrid clock synchronization (syncs with server, counts down locally, auto-corrects drift)
 * - Syncs timer with server timestamp using calculated clock offset
 * - Auto-finish when all players answered (host only)
 * - Auto-finish when time expires (host only)
 * - Race condition protection
 * - Countdown to 0
 * - Drift detection and auto-correction every 5 seconds
 *
 * Clock Sync Algorithm:
 * 1. On question start: Calculate clock offset with Firestore server
 * 2. Use offset to calculate initial time remaining
 * 3. Countdown locally for smooth UX
 * 4. Every 5 seconds: Check for drift and auto-correct if needed
 * 5. Handle edge cases: tab backgrounding, device sleep
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
}: UseQuestionTimerOptions) {
  const [time, setTime] = useState(timeLimit);
  const finishedRef = useRef(false);
  const clockOffsetRef = useRef<number>(0);
  const driftCheckIntervalRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  // Determine if we should use clock sync
  const useClockSync = enableClockSync && firestore && questionStartTime;

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

  // Timer countdown with hybrid clock synchronization
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      // HYBRID SYNC PHASE 1: Initial synchronization
      const syncAndStartTimer = async () => {
        let initialTime = timeLimit;

        if (useClockSync && questionStartTime && firestore) {
          try {
            // Calculate clock offset with Firestore server
            const offset = await calculateClockOffset(firestore);

            // Validate offset is reasonable (within ±5 minutes)
            if (isOffsetReasonable(offset)) {
              clockOffsetRef.current = offset;
              console.log(`[Timer] Clock sync successful, offset: ${offset.toFixed(0)}ms`);
            } else {
              console.warn(`[Timer] Unreasonable offset detected (${offset.toFixed(0)}ms), using fallback`);
              clockOffsetRef.current = 0;
            }

            // Calculate initial time using synchronized clock
            initialTime = calculateTimeRemaining(
              questionStartTime.toMillis(),
              timeLimit,
              clockOffsetRef.current
            );

            console.log(`[Timer] Initial sync - Remaining: ${initialTime}s (offset: ${clockOffsetRef.current.toFixed(0)}ms)`);

          } catch (error) {
            console.error('[Timer] Clock sync failed, falling back to local time:', error);
            clockOffsetRef.current = 0;

            // Fallback to basic sync without offset
            const elapsedSeconds = Math.floor((Date.now() - questionStartTime.toMillis()) / 1000);
            if (elapsedSeconds >= 0 && elapsedSeconds < timeLimit) {
              initialTime = Math.max(0, timeLimit - elapsedSeconds);
            }
          }
        } else if (questionStartTime) {
          // Fallback: Basic sync without clock offset
          const questionStartMillis = questionStartTime.toMillis();
          const nowMillis = Date.now();
          const elapsedMillis = nowMillis - questionStartMillis;
          const elapsedSeconds = Math.floor(elapsedMillis / 1000);

          if (elapsedSeconds >= 0 && elapsedSeconds < timeLimit) {
            initialTime = Math.max(0, timeLimit - elapsedSeconds);
            console.log(`[Timer] Basic sync (no clock offset) - Remaining: ${initialTime}s`);
          } else {
            console.warn(`[Timer] Clock skew detected: elapsed=${elapsedSeconds}s, using full time`);
            initialTime = timeLimit;
          }
        }

        setTime(initialTime);

        // HYBRID SYNC PHASE 2: Local countdown for smooth UX
        countdownIntervalRef.current = setInterval(() => {
          setTime(prev => {
            if (prev <= 1) {
              // Clear timer before calling auto-finish
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
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

        // HYBRID SYNC PHASE 3: Drift detection and auto-correction
        if (useClockSync && questionStartTime) {
          driftCheckIntervalRef.current = setInterval(() => {
            const drift = detectDrift(
              time,
              questionStartTime.toMillis(),
              timeLimit,
              clockOffsetRef.current,
              0.5 // 500ms threshold
            );

            if (drift.hasDrift) {
              console.warn(
                `[Timer] Auto-correcting drift: ${time}s → ${drift.correctTime}s ` +
                `(drift: ${drift.driftAmount.toFixed(2)}s)`
              );
              setTime(drift.correctTime);
            }
          }, 5000); // Check every 5 seconds
        }
      };

      syncAndStartTimer();

      // Cleanup function
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        if (driftCheckIntervalRef.current) {
          clearInterval(driftCheckIntervalRef.current);
        }
      };
    }
  }, [currentQuestionIndex, isActive, timeLimit, questionStartTime, onAutoFinish, useClockSync, firestore]);

  // HYBRID SYNC PHASE 4: Handle tab backgrounding / device sleep
  useEffect(() => {
    if (!useClockSync || !isActive || !questionStartTime || !firestore) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Timer] Tab became visible, re-syncing clock...');

        try {
          // Re-sync clock offset
          const offset = await calculateClockOffset(firestore);

          if (isOffsetReasonable(offset)) {
            clockOffsetRef.current = offset;

            // Recalculate time remaining
            const correctTime = calculateTimeRemaining(
              questionStartTime.toMillis(),
              timeLimit,
              offset
            );

            console.log(`[Timer] Re-synced after tab focus - Remaining: ${correctTime}s (offset: ${offset.toFixed(0)}ms)`);
            setTime(correctTime);
          }
        } catch (error) {
          console.error('[Timer] Re-sync failed:', error);
        }
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
