import type { PlayerAnswer } from '../types';

export type AnswerDistributionEntry = { label: string; count: number; isCorrect: boolean };
export type FreeResponseEntry = { text: string; count: number; isCorrect: boolean };
export type SliderDistribution = {
  correctValue: number;
  minValue: number;
  maxValue: number;
  unit?: string;
  playerValues: number[];
};

/**
 * Build answer distribution for single-choice or poll-single questions
 */
export function buildSingleChoiceDistribution(
  answers: PlayerAnswer[],
  answerOptions: { text: string }[],
  correctAnswerIndex: number | undefined,
  isScored: boolean
): AnswerDistributionEntry[] {
  const answerCounts = new Map<number, number>();
  for (const a of answers) {
    if (a.answerIndex !== undefined) {
      answerCounts.set(a.answerIndex, (answerCounts.get(a.answerIndex) || 0) + 1);
    }
  }

  return answerOptions.map((ans, i) => ({
    label: ans.text,
    count: answerCounts.get(i) || 0,
    isCorrect: isScored && correctAnswerIndex === i,
  }));
}

/**
 * Build answer distribution for multiple-choice or poll-multiple questions
 */
export function buildMultipleChoiceDistribution(
  answers: PlayerAnswer[],
  answerOptions: { text: string }[],
  correctAnswerIndices: number[] | undefined,
  isScored: boolean
): AnswerDistributionEntry[] {
  const answerCounts = new Map<number, number>();
  for (const a of answers) {
    for (const idx of (a.answerIndices || [])) {
      answerCounts.set(idx, (answerCounts.get(idx) || 0) + 1);
    }
  }

  const correctSet = new Set(correctAnswerIndices || []);
  return answerOptions.map((ans, i) => ({
    label: ans.text,
    count: answerCounts.get(i) || 0,
    isCorrect: isScored && correctSet.has(i),
  }));
}

/**
 * Build slider distribution for slider questions
 */
export function buildSliderDistribution(
  answers: PlayerAnswer[],
  correctValue: number,
  minValue: number,
  maxValue: number,
  unit?: string
): SliderDistribution {
  const playerValues = answers
    .filter(a => a.sliderValue !== undefined)
    .map(a => a.sliderValue as number);

  return {
    correctValue,
    minValue,
    maxValue,
    ...(unit && { unit }),
    playerValues,
  };
}

/**
 * Build free-response distribution for free-response questions
 */
export function buildFreeResponseDistribution(
  answers: PlayerAnswer[],
  correctAnswer: string,
  alternativeAnswers: string[]
): FreeResponseEntry[] {
  const normalizedCorrect = correctAnswer.toLowerCase().trim();
  const normalizedAlternatives = alternativeAnswers.map(a => a.toLowerCase().trim());

  const textCounts = new Map<string, { count: number; isCorrect: boolean }>();

  for (const a of answers) {
    const text = (a.textAnswer || '').trim();
    const lowerText = text.toLowerCase();
    const isCorrect = lowerText === normalizedCorrect || normalizedAlternatives.includes(lowerText);

    if (!textCounts.has(text)) {
      textCounts.set(text, { count: 0, isCorrect });
    }
    textCounts.get(text)!.count++;
  }

  return Array.from(textCounts.entries())
    .map(([text, data]) => ({
      text,
      count: data.count,
      isCorrect: data.isCorrect,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
