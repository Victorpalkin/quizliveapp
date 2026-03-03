import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '../provider';
import type { LeaderboardEntry, PlayerRankInfo, Presentation, SingleChoiceQuestion } from '@/lib/types';
import { logError } from '@/lib/error-logging';

interface SlideResponseDoc {
  slideId: string;
  playerId: string;
  playerName: string;
  answerIndex?: number;
  timeRemaining?: number;
}

/**
 * Hook to compute leaderboard from slideResponses for presentations.
 * Scores are computed client-side by comparing answers against quiz slide correctAnswerIndex.
 *
 * Scoring: correct answer = 100 + round((timeRemaining / timeLimit) * 900) points (100-1000)
 * Incorrect or missing = 0 points
 *
 * @param gameId - The presentation game ID
 * @param presentation - The presentation with slides (needed to determine correct answers)
 */
export function usePresentationLeaderboard(gameId: string, presentation: Presentation) {
  const firestore = useFirestore();
  const [responses, setResponses] = useState<SlideResponseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Get quiz slides with their correct answers and time limits
  const quizSlides = useMemo(() => {
    return presentation.slides
      .filter(s => s.type === 'quiz' && s.question)
      .map(s => ({
        slideId: s.id,
        correctAnswerIndex: (s.question as SingleChoiceQuestion).correctAnswerIndex,
        timeLimit: (s.question as SingleChoiceQuestion).timeLimit || 20,
      }));
  }, [presentation.slides]);

  // Listen to all slideResponses
  useEffect(() => {
    if (!firestore || !gameId) {
      setResponses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const responsesRef = collection(firestore, 'games', gameId, 'slideResponses');

    const unsubscribe = onSnapshot(
      responsesRef,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => doc.data() as SlideResponseDoc);
        setResponses(docs);
        setLoading(false);
      },
      (err) => {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: 'usePresentationLeaderboard',
          gameId,
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId]);

  // Compute leaderboard from responses + quiz slides
  const { topPlayers, totalPlayers, playerRanks } = useMemo(() => {
    if (quizSlides.length === 0) {
      return { topPlayers: [], totalPlayers: 0, playerRanks: {} };
    }

    // Build a set of quiz slide IDs for quick lookup
    const quizSlideMap = new Map(quizSlides.map(q => [q.slideId, q]));

    // Aggregate scores per player
    const playerScores = new Map<string, { name: string; score: number }>();

    // Track all unique players across all responses (not just quiz)
    const allPlayerIds = new Set<string>();

    for (const response of responses) {
      if (response.playerId) {
        allPlayerIds.add(response.playerId);
      }

      const quizSlide = quizSlideMap.get(response.slideId);
      if (!quizSlide || response.answerIndex === undefined) continue;

      const playerId = response.playerId;
      if (!playerId) continue;

      if (!playerScores.has(playerId)) {
        playerScores.set(playerId, { name: response.playerName || 'Unknown', score: 0 });
      }

      const player = playerScores.get(playerId)!;

      // Check if answer is correct
      if (response.answerIndex === quizSlide.correctAnswerIndex) {
        const timeRemaining = response.timeRemaining || 0;
        const timeBonus = Math.round((timeRemaining / quizSlide.timeLimit) * 900);
        player.score += 100 + Math.max(0, timeBonus);
      }
    }

    // Build sorted leaderboard entries
    const entries: LeaderboardEntry[] = Array.from(playerScores.entries())
      .map(([id, { name, score }]) => ({
        id,
        name,
        score,
        currentStreak: 0,
        lastQuestionPoints: 0,
      }))
      .sort((a, b) => b.score - a.score);

    // Compute player ranks
    const ranks: Record<string, PlayerRankInfo> = {};
    const total = Math.max(allPlayerIds.size, entries.length);

    entries.forEach((entry, index) => {
      ranks[entry.id] = {
        rank: index + 1,
        totalPlayers: total,
      };
    });

    return {
      topPlayers: entries,
      totalPlayers: total,
      playerRanks: ranks,
    };
  }, [responses, quizSlides]);

  return {
    topPlayers,
    totalPlayers,
    playerRanks,
    loading,
  };
}
