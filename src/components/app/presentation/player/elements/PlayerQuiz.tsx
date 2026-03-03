'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
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
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-bold text-center"
      >
        {config.question}
      </motion.h2>

      <div className="grid grid-cols-1 gap-3">
        {config.answers.map((answer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Button
              onClick={() => handleSubmit(i)}
              disabled={submitting || selectedIndex !== null}
              variant="outline"
              className={`w-full h-14 text-base font-medium text-white border-0 transition-all duration-200 ${
                selectedIndex === i
                  ? 'ring-4 ring-white/50 scale-[0.97]'
                  : selectedIndex !== null
                    ? 'opacity-50 scale-[0.97]'
                    : 'hover:brightness-110 hover:shadow-lg'
              }`}
              style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
            >
              <span className="flex items-center gap-2">
                {selectedIndex === i && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.span>
                )}
                {answer.text}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
