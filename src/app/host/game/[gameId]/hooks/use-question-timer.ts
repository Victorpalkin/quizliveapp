import { useState, useEffect, useRef } from 'react';
import type { Game } from '@/lib/types';

// Timer synchronization constants
const AUTO_FINISH_DELAY_MS = 1500; // Delay before auto-finishing when all players answered

/**
 * Host-specific question timer hook.
 *
 * Uses totalPlayers and totalAnswered from the leaderboard aggregate
 * instead of subscribed player array. This avoids the O(n) update problem.
 */
export function useQuestionTimer(
  game: Game | null,
  totalPlayers: number,
  timeLimit: number,
  onFinishQuestion: () => void,
  totalAnswered: number
) {
  const [time, setTime] = useState(timeLimit);
  const finishedRef = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  const isActive = game?.state === 'question';
  const currentQuestionIndex = game?.currentQuestionIndex || 0;

  // Auto-finish when all players answered
  // Includes delay to allow in-flight answer submissions to complete
  useEffect(() => {
    if (isActive && !finishedRef.current && totalPlayers > 0) {
      if (totalAnswered >= totalPlayers) {
        console.log('[Timer] All players answered - delaying auto-finish by 1.5s for in-flight submissions');

        const timeoutId = setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            console.log('[Timer] Auto-finishing after delay');
            onFinishQuestion();
          }
        }, AUTO_FINISH_DELAY_MS);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [totalPlayers, totalAnswered, isActive, onFinishQuestion]);

  // Timer countdown
  useEffect(() => {
    if (isActive) {
      // Reset finished flag for new question
      finishedRef.current = false;

      console.log(`[Timer] Starting at full time: ${timeLimit}s`);
      setTime(timeLimit);

      // Start countdown immediately
      countdownIntervalRef.current = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            // Auto-finish on timeout
            if (!finishedRef.current) {
              finishedRef.current = true;
              onFinishQuestion();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [currentQuestionIndex, isActive, timeLimit, onFinishQuestion]);

  return { time };
}
