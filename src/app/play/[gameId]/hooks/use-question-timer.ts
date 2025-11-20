import type { Timestamp } from 'firebase/firestore';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';
import { useFirestore } from '@/firebase';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

/**
 * Player-specific wrapper for shared question timer hook
 * Enables clock synchronization to prevent timer skew issues
 *
 * @param clockOffset - Pre-calculated clock offset from lobby (optimizes first question start)
 */
export function useQuestionTimer(
  state: PlayerState,
  timeLimit: number,
  questionStartTime: Timestamp | undefined,
  currentQuestionIndex: number,
  clockOffset: number = 0
) {
  const firestore = useFirestore();

  const { time, resetTimer } = useSharedQuestionTimer({
    timeLimit,
    questionStartTime,
    currentQuestionIndex,
    isActive: state === 'question',
    firestore,
    enableClockSync: true,
    initialClockOffset: clockOffset,
  });

  return {
    time,
    resetTimer
  };
}
