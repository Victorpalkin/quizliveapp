import { useMemo } from 'react';
import type { Question, Player, Game } from '@/lib/types';

interface FreeResponseResult {
  playerName: string;
  textAnswer: string;
  isCorrect: boolean;
  points: number;
  wasTimeout: boolean;
}

export function useAnswerDistribution(question: Question | undefined, players: Player[], game: Game | null) {
  // Answer distribution for single-choice, multiple-choice, and poll questions
  const answerDistribution = useMemo(() => {
    if (!question || !players) return [];

    // For slider, slide, and free-response questions, return empty array
    if (question.type === 'slider' || question.type === 'slide' || question.type === 'free-response') {
      return [];
    }

    // For single-choice, multiple-choice, and poll questions
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
      // Poll questions don't have correct answers
      let isCorrect = false;
      if (question.type === 'single-choice') {
        isCorrect = question.correctAnswerIndex === index;
      } else if (question.type === 'multiple-choice') {
        isCorrect = question.correctAnswerIndices.includes(index);
      }
      // For poll-single and poll-multiple, isCorrect remains false

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

  // Free-response question responses
  const freeResponseResults = useMemo((): FreeResponseResult[] => {
    if (!question || question.type !== 'free-response' || !players || !game) return [];

    return players
      .map(p => {
        const playerAnswer = p.answers?.find(a => a.questionIndex === game.currentQuestionIndex);
        if (!playerAnswer) return null;
        return {
          playerName: p.name,
          textAnswer: playerAnswer.textAnswer || '',
          isCorrect: playerAnswer.isCorrect,
          points: playerAnswer.points,
          wasTimeout: playerAnswer.wasTimeout,
        };
      })
      .filter((r): r is FreeResponseResult => r !== null);
  }, [question, players, game]);

  return {
    answerDistribution,
    sliderResponses,
    freeResponseResults
  };
}
