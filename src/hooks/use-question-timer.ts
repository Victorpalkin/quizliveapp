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
const DRIFT_THRESHOLD_SECONDS = 0.2; // 200ms threshold for drift auto-correction
const DRIFT_CHECK_INTERVAL_MS = 2000; // Check for drift every 2 seconds
const AUTO_FINISH_DELAY_MS = 1500; // Delay before auto-finishing when all players answered

interface UseQuestionTimerOptions {
  timeLimit: number;
  questionStartTime: Timestamp | undefined;
  currentQuestionIndex: number;
  isActive?: boolean;
  isPreparing?: boolean; // Signal to pre-calculate offset before question starts
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
  isPreparing = false,
  players,
  onAutoFinish,
  firestore,
  enableClockSync = true,
}: UseQuestionTimerOptions) {
  const [time, setTime] = useState(timeLimit);
  const finishedRef = useRef(false);
  const clockOffsetRef = useRef<number>(0);
  const offsetReadyRef = useRef(false); // Track if offset is pre-calculated
  const driftCheckIntervalRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const timeRef = useRef(time); // Track current time for drift detection

  // Keep timeRef in sync with time state
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // Determine if we should use clock sync
  const useClockSync = enableClockSync && firestore && questionStartTime;

  // PRE-CALCULATE OFFSET IN PREPARING STATE
  // This eliminates race condition between sync and question start
  useEffect(() => {
    let cancelled = false;

    if (isPreparing && useClockSync && firestore && !offsetReadyRef.current) {
      const preCalculateOffset = async () => {
        try {
          console.log('[Timer] Pre-calculating clock offset in preparing state...');
          const offset = await calculateClockOffset(firestore);

          // Check if component unmounted or state changed during async operation
          if (cancelled) {
            console.log('[Timer] Pre-calculation cancelled (state changed)');
            return;
          }

          if (isOffsetReasonable(offset)) {
            clockOffsetRef.current = offset;
            offsetReadyRef.current = true;
            console.log(`[Timer] Offset pre-calculated: ${offset.toFixed(0)}ms`);
          } else {
            console.warn(`[Timer] Unreasonable offset: ${offset.toFixed(0)}ms, using 0`);
            clockOffsetRef.current = 0;
            offsetReadyRef.current = true;
          }
        } catch (error) {
          if (!cancelled) {
            console.error('[Timer] Pre-calculation failed:', error);
            clockOffsetRef.current = 0;
            offsetReadyRef.current = true;
          }
        }
      };

      preCalculateOffset();
    }

    // Reset offset ready flag when question changes
    if (!isPreparing && !isActive) {
      offsetReadyRef.current = false;
    }

    // Cleanup: cancel async operation if component unmounts or state changes
    return () => {
      cancelled = true;
    };
  }, [isPreparing, useClockSync, firestore, isActive, currentQuestionIndex]);

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

  // Timer countdown with hybrid clock synchronization
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      // HYBRID SYNC PHASE 1: Initial synchronization
      const syncAndStartTimer = async () => {
        let initialTime = timeLimit;

        if (useClockSync && questionStartTime && firestore) {
          // Use pre-calculated offset if available, otherwise calculate now
          if (!offsetReadyRef.current) {
            try {
              console.log('[Timer] Offset not pre-calculated, calculating now...');
              const offset = await calculateClockOffset(firestore);

              // Validate offset is reasonable (within ±5 minutes)
              if (isOffsetReasonable(offset)) {
                clockOffsetRef.current = offset;
                console.log(`[Timer] Clock sync successful, offset: ${offset.toFixed(0)}ms`);
              } else {
                console.warn(`[Timer] Unreasonable offset detected (${offset.toFixed(0)}ms), using fallback`);
                clockOffsetRef.current = 0;
              }
            } catch (error) {
              console.error('[Timer] Clock sync failed, falling back to local time:', error);
              clockOffsetRef.current = 0;
            }
          } else {
            console.log(`[Timer] Using pre-calculated offset: ${clockOffsetRef.current.toFixed(0)}ms`);
          }

          // Calculate initial time using synchronized clock (pre-calculated or just calculated)
          try {
            initialTime = calculateTimeRemaining(
              questionStartTime.toMillis(),
              timeLimit,
              clockOffsetRef.current
            );

            console.log(`[Timer] Initial time - Remaining: ${initialTime}s (offset: ${clockOffsetRef.current.toFixed(0)}ms)`);
          } catch (error) {
            console.error('[Timer] Time calculation failed:', error);
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
              timeRef.current, // Use ref to get current value, not stale closure
              questionStartTime.toMillis(),
              timeLimit,
              clockOffsetRef.current,
              DRIFT_THRESHOLD_SECONDS
            );

            if (drift.hasDrift) {
              console.warn(
                `[Timer] Auto-correcting drift: ${timeRef.current}s → ${drift.correctTime}s ` +
                `(drift: ${drift.driftAmount.toFixed(2)}s)`
              );
              setTime(drift.correctTime);
            }
          }, DRIFT_CHECK_INTERVAL_MS);
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

    let cancelled = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Timer] Tab became visible, re-syncing clock...');

        try {
          // Re-sync clock offset
          const offset = await calculateClockOffset(firestore);

          // Check if component unmounted or state changed during async operation
          if (cancelled) {
            console.log('[Timer] Re-sync cancelled (state changed)');
            return;
          }

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
          if (!cancelled) {
            console.error('[Timer] Re-sync failed:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
