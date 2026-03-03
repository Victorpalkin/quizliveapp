'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponses } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface PlayerQuizProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

export function PlayerQuiz({ element, gameId, playerId, playerName, onSubmitted }: PlayerQuizProps) {
  const config = element.quizConfig;
  const { submitQuizAnswer } = useResponses(gameId);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!config) return null;

  const handleSubmit = async (index: number) => {
    if (submitting || selectedIndex !== null) return;
    setSelectedIndex(index);
    setSubmitting(true);

    try {
      await submitQuizAnswer({
        gameId,
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        answerIndex: index,
        timeRemaining: config.timeLimit > 0 ? config.timeLimit : 0,
      });
      onSubmitted();
    } catch {
      setSelectedIndex(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center">{config.question}</h2>

      <div className="grid grid-cols-1 gap-3">
        {config.answers.map((answer, i) => (
          <Button
            key={i}
            onClick={() => handleSubmit(i)}
            disabled={submitting || selectedIndex !== null}
            variant="outline"
            className={`h-14 text-base font-medium text-white border-0 ${
              selectedIndex === i ? 'ring-4 ring-white/50 scale-95' : ''
            }`}
            style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
          >
            {answer.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
