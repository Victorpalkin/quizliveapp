import type { Timestamp } from 'firebase/firestore';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';

type PlayerState = 'joining' | 'lobby' | 'preparing' | 'question' | 'waiting' | 'result' | 'ended' | 'cancelled' | 'reconnecting' | 'session-invalid';

/**
 * Player-specific wrapper for shared question timer hook
 */
export function useQuestionTimer(
  state: PlayerState,
  timeLimit: number,
  questionStartTime: Timestamp | undefined,
  currentQuestionIndex: number
) {
  const { time, resetTimer } = useSharedQuestionTimer({
    timeLimit,
    questionStartTime,
    currentQuestionIndex,
    isActive: state === 'question',
  });

  return {
    time,
    resetTimer
  };
}
