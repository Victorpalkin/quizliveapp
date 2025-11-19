import type { Timestamp } from 'firebase/firestore';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';
import { useFirestore } from '@/firebase';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

/**
 * Player-specific wrapper for shared question timer hook
 * Enables clock synchronization to prevent timer skew issues
 * Pre-calculates offset in preparing state for accurate initial time
 */
export function useQuestionTimer(
  state: PlayerState,
  timeLimit: number,
  questionStartTime: Timestamp | undefined,
  currentQuestionIndex: number
) {
  const firestore = useFirestore();

  const { time, resetTimer } = useSharedQuestionTimer({
    timeLimit,
    questionStartTime,
    currentQuestionIndex,
    isActive: state === 'question',
    isPreparing: state === 'preparing', // Signal to pre-calculate offset
    firestore,
    enableClockSync: true,
  });

  return {
    time,
    resetTimer
  };
}
