import { useMemo } from 'react';
import type { Question, Player, Game } from '@/lib/types';

export function useAnswerDistribution(question: Question | undefined, players: Player[], game: Game | null) {
  // Answer distribution for single-choice and multiple-choice questions
  const answerDistribution = useMemo(() => {
    if (!question || !players) return [];

    // For slider and slide questions, return empty array
    if (question.type === 'slider' || question.type === 'slide') {
      return [];
    }

    // For single-choice and multiple-choice questions
    if (!game) return [];
    const counts = Array(question.answers.length).fill(0);

    players.forEach(player => {
      const playerAnswer = player.answers?.find(a => a.questionIndex === game.currentQuestionIndex);
      if (!playerAnswer) return;

      if (playerAnswer.answerIndices && Array.isArray(playerAnswer.answerIndices)) {
        playerAnswer.answerIndices.forEach(idx => {
          if (idx >= 0 && idx < counts.length) {
            counts[idx]++;
          }
        });
      } else if (playerAnswer.answerIndex !== undefined && playerAnswer.answerIndex >= 0) {
        counts[playerAnswer.answerIndex]++;
      }
    });

    return question.answers.map((ans, index) => {
      // Determine if this answer is correct based on question type
      const isCorrect = question.type === 'single-choice'
        ? question.correctAnswerIndex === index
        : question.correctAnswerIndices.includes(index);

      return {
        name: ans.text,
        total: counts[index],
        isCorrect,
      };
    });
  }, [question, players, game]);

  // Slider question responses
  const sliderResponses = useMemo(() => {
    if (!question || question.type !== 'slider' || !players || !game) return [];

    return players
      .map(p => {
        const playerAnswer = p.answers?.find(a => a.questionIndex === game.currentQuestionIndex);
        if (!playerAnswer || playerAnswer.sliderValue === undefined) return null;
        return {
          name: p.name,
          value: playerAnswer.sliderValue,
        };
      })
      .filter((r): r is { name: string; value: number } => r !== null)
      .sort((a, b) => a.value - b.value);
  }, [question, players, game]);

  return {
    answerDistribution,
    sliderResponses
  };
}
