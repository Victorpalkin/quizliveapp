'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponses } from '@/firebase/presentation';
import { usePresentationTimer } from '@/hooks/use-presentation-timer';
import { CircularTimer } from '@/components/app/circular-timer';
import type { SlideElement } from '@/lib/types';
import type { QuizResult } from '@/app/play/presentation/[gamePin]/hooks/use-player-state-machine';

interface PlayerQuizProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  timerStartedAt: Date | null;
  onSubmitted: () => void;
  onResult: (elementId: string, result: QuizResult) => void;
  onTimeout: (elementId: string) => void;
}

export function PlayerQuiz({
  element,
  gameId,
  playerId,
  playerName,
  timerStartedAt,
  onSubmitted,
  onResult,
  onTimeout,
}: PlayerQuizProps) {
  const config = element.quizConfig;
  const { submitQuizAnswer } = useResponses(gameId);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const timeLimit = config?.timeLimit ?? 0;
  const { timeRemaining, isExpired } = usePresentationTimer(timerStartedAt, timeLimit);

  // Handle timeout
  useEffect(() => {
    if (isExpired && !timedOut && selectedIndex === null && !submitting) {
      setTimedOut(true);
      onTimeout(element.id);
    }
  }, [isExpired, timedOut, selectedIndex, submitting, element.id, onTimeout]);

  if (!config) return null;

  const isDisabled = submitting || selectedIndex !== null || timedOut;

  const handleSubmit = async (index: number) => {
    if (isDisabled) return;
    setSelectedIndex(index);
    setSubmitting(true);

    try {
      const result = await submitQuizAnswer({
        gameId,
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        answerIndex: index,
        timeRemaining: timeLimit > 0 ? timeRemaining : 0,
      });

      const data = result.data as { isCorrect: boolean; points: number };
      onResult(element.id, {
        isCorrect: data.isCorrect,
        points: data.points,
        wasTimeout: false,
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
      {/* Timer */}
      {timeLimit > 0 && timerStartedAt && (
        <div className="flex justify-center">
          {timedOut ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-4 py-2 rounded-full bg-orange-500/15 text-orange-500 font-semibold"
            >
              Time&apos;s Up!
            </motion.div>
          ) : (
            <CircularTimer
              time={timeRemaining}
              timeLimit={timeLimit}
              size={56}
              strokeWidth={3}
            />
          )}
        </div>
      )}

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
              disabled={isDisabled}
              variant="outline"
              className={`w-full h-14 text-base font-medium text-white border-0 transition-all duration-200 ${
                selectedIndex === i
                  ? 'ring-4 ring-white/50 scale-[0.97]'
                  : selectedIndex !== null || timedOut
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
