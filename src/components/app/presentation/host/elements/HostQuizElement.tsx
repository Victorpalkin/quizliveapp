'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponseCount } from '@/firebase/presentation';
import { usePresentationTimer } from '@/hooks/use-presentation-timer';
import { CircularTimer } from '@/components/app/circular-timer';
import type { SlideElement } from '@/lib/types';

interface HostQuizElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
  timerStartedAt: Date | null;
}

export function HostQuizElement({ element, gameId, playerCount, timerStartedAt }: HostQuizElementProps) {
  const config = element.quizConfig;
  const count = useResponseCount(gameId, element.id);
  const { timeRemaining, isExpired } = usePresentationTimer(
    timerStartedAt,
    config?.timeLimit ?? 0
  );

  if (!config) return null;

  const progress = playerCount > 0 ? (count / playerCount) * 100 : 0;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-full h-full flex flex-col p-4 relative">
      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-4 flex-shrink-0"
      >
        {config.question}
      </motion.h2>

      {/* Answer grid */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {config.answers.map((answer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center justify-center rounded-xl text-white font-semibold text-lg p-3 shadow-lg hover:brightness-110 transition-all"
            style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
          >
            {answer.text}
          </motion.div>
        ))}
      </div>

      {/* Response counter + timer */}
      <div className="flex items-center justify-between mt-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
              <motion.circle
                cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="text-primary"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {count}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">/ {playerCount} answered</span>
        </div>
        {config.timeLimit > 0 && (
          <CircularTimer
            time={timeRemaining}
            timeLimit={config.timeLimit}
            size={48}
            strokeWidth={3}
          />
        )}
      </div>

      {/* Time's Up overlay */}
      <AnimatePresence>
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <Clock className="w-16 h-16 text-orange-400 mx-auto mb-3" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white"
              >
                Time&apos;s Up!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 mt-2"
              >
                {count} of {playerCount} answered
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
