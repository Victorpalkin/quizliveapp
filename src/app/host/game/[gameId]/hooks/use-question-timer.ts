import type { Game, Player } from '@/lib/types';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';

/**
 * Host-specific wrapper for shared question timer hook
 */
export function useQuestionTimer(
  game: Game | null,
  players: Player[],
  timeLimit: number,
  onFinishQuestion: () => void
) {
  const { time, answeredPlayers } = useSharedQuestionTimer({
    timeLimit,
    questionStartTime: game?.questionStartTime,
    currentQuestionIndex: game?.currentQuestionIndex || 0,
    isActive: game?.state === 'question',
    players,
    onAutoFinish: onFinishQuestion,
  });

  return {
    time,
    answeredPlayers
  };
}
