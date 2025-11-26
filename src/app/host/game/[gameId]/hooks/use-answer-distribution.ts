import { useMemo } from 'react';
import type { Question, Game, LeaderboardEntry } from '@/lib/types';

/**
 * Provides slider and free-response result data for host visualization.
 *
 * Note: Answer distribution for choice questions is now computed directly
 * from the answerCounts array in the leaderboard aggregate (see page.tsx).
 * This avoids O(n) computation on every player update.
 *
 * For slider and free-response questions, we would need to add aggregate
 * fields to track responses. For now, these views show limited data.
 * TODO: Add sliderResponses and freeResponseResults to aggregate document
 * if detailed response views are needed for 500+ player games.
 */
export function useAnswerDistribution(
  question: Question | undefined,
  topPlayers: LeaderboardEntry[],
  game: Game | null
) {
  // Slider question responses
  // Note: Currently returns empty array - would need aggregate support
  // for games with 500+ players
  const sliderResponses = useMemo(() => {
    if (!question || question.type !== 'slider' || !game) return [];

    // For now, return empty array
    // In the future, we could add slider distribution to the aggregate document
    // or use a separate query to fetch slider responses
    return [] as { name: string; value: number }[];
  }, [question, game]);

  // Free-response question responses
  // Note: Currently returns empty array - would need aggregate support
  // for games with 500+ players
  const freeResponseResults = useMemo(() => {
    if (!question || question.type !== 'free-response' || !game) return [];

    // For now, return empty array
    // In the future, we could add free-response results to the aggregate document
    // or use a separate query to fetch responses
    return [] as {
      playerName: string;
      textAnswer: string;
      isCorrect: boolean;
      points: number;
      wasTimeout: boolean;
    }[];
  }, [question, game]);

  return {
    sliderResponses,
    freeResponseResults
  };
}
