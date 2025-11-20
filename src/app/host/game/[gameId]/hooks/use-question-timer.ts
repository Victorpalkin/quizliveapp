import type { Game, Player } from '@/lib/types';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';
import { useFirestore } from '@/firebase';

/**
 * Host-specific wrapper for shared question timer hook
 * Enables clock synchronization to stay in sync with players
 *
 * @param clockOffset - Pre-calculated clock offset from game start (optimizes timer synchronization)
 */
export function useQuestionTimer(
  game: Game | null,
  players: Player[],
  timeLimit: number,
  onFinishQuestion: () => void,
  clockOffset: number = 0
) {
  const firestore = useFirestore();

  const { time, answeredPlayers } = useSharedQuestionTimer({
    timeLimit,
    questionStartTime: game?.questionStartTime,
    currentQuestionIndex: game?.currentQuestionIndex || 0,
    isActive: game?.state === 'question',
    players,
    onAutoFinish: onFinishQuestion,
    firestore,
    enableClockSync: true,
    initialClockOffset: clockOffset,
  });

  return {
    time,
    answeredPlayers
  };
}
