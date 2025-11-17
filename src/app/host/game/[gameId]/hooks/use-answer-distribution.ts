import { useMemo } from 'react';
import type { Question, Player } from '@/lib/types';

export function useAnswerDistribution(question: Question | undefined, players: Player[]) {
  // Answer distribution for single-choice and multiple-choice questions
  const answerDistribution = useMemo(() => {
    if (!question || !players) return [];

    // For slider and slide questions, return empty array
    if (question.type === 'slider' || question.type === 'slide') {
      return [];
    }

    // For single-choice and multiple-choice questions
    const counts = Array(question.answers.length).fill(0);
    players.forEach(player => {
      // Handle multi-answer responses
      if (player.lastAnswerIndices && Array.isArray(player.lastAnswerIndices)) {
        player.lastAnswerIndices.forEach(idx => {
          if (idx >= 0 && idx < counts.length) {
            counts[idx]++;
          }
        });
      }
      // Handle single answer responses
      else if (player.lastAnswerIndex !== null && player.lastAnswerIndex !== undefined && player.lastAnswerIndex >= 0) {
        counts[player.lastAnswerIndex]++;
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
  }, [question, players]);

  // Slider question responses
  const sliderResponses = useMemo(() => {
    if (!question || question.type !== 'slider' || !players) return [];

    return players
      .filter(p => p.lastSliderValue !== null && p.lastSliderValue !== undefined)
      .map(p => ({
        name: p.name,
        value: p.lastSliderValue!,
      }))
      .sort((a, b) => a.value - b.value);
  }, [question, players]);

  return {
    answerDistribution,
    sliderResponses
  };
}
