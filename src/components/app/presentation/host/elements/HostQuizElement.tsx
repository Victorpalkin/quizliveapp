'use client';

import { motion } from 'motion/react';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponseCount } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface HostQuizElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostQuizElement({ element, gameId, playerCount }: HostQuizElementProps) {
  const config = element.quizConfig;
  const count = useResponseCount(gameId, element.id);

  if (!config) return null;

  const progress = playerCount > 0 ? (count / playerCount) * 100 : 0;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-full h-full flex flex-col p-4">
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

      {/* Response counter with progress ring */}
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
          <span className="font-mono text-lg font-bold text-foreground">
            {config.timeLimit}s
          </span>
        )}
      </div>
    </div>
  );
}
