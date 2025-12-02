import type { Game } from '@/lib/types';
import { useQuestionTimer as useSharedQuestionTimer } from '@/hooks/use-question-timer';

/**
 * Host-specific question timer hook.
 *
 * Wrapper around the shared timer hook that uses totalPlayers and totalAnswered
 * from the leaderboard aggregate instead of subscribed player array.
 * This avoids the O(n) update problem.
 */
export function useQuestionTimer(
  game: Game | null,
  totalPlayers: number,
  timeLimit: number,
  onFinishQuestion: () => void,
  totalAnswered: number
) {
  const { time } = useSharedQuestionTimer({
    timeLimit,
    currentQuestionIndex: game?.currentQuestionIndex || 0,
    isActive: game?.state === 'question',
    totalPlayers,
    totalAnswered,
    onAutoFinish: onFinishQuestion,
  });

  return { time };
}
