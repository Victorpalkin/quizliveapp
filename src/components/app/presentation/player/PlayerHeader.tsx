'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame } from 'lucide-react';

interface PlayerHeaderProps {
  playerName: string;
  score: number;
  streak: number;
  showScore?: boolean;
}

export function PlayerHeader({ playerName, score, streak, showScore = true }: PlayerHeaderProps) {
  const [scoreChange, setScoreChange] = useState<number | null>(null);
  const prevScore = useRef(score);

  useEffect(() => {
    const diff = score - prevScore.current;
    if (diff > 0) {
      setScoreChange(diff);
      const timer = setTimeout(() => setScoreChange(null), 1200);
      prevScore.current = score;
      return () => clearTimeout(timer);
    }
    prevScore.current = score;
  }, [score]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 glass-subtle flex-shrink-0">
      <span className="font-medium text-sm truncate max-w-[120px]">{playerName}</span>
      {showScore && (
        <div className="flex items-center gap-3 relative">
          {streak >= 2 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-orange-500"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  filter: streak >= 5
                    ? ['drop-shadow(0 0 4px rgb(249 115 22 / 0.5))', 'drop-shadow(0 0 8px rgb(249 115 22 / 0.8))', 'drop-shadow(0 0 4px rgb(249 115 22 / 0.5))']
                    : undefined,
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Flame className="h-4 w-4" />
              </motion.div>
              <span className="text-sm font-bold">{streak}</span>
            </motion.div>
          )}
          <div className="relative">
            <motion.span
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-sm font-mono font-bold"
            >
              {score.toLocaleString()}
            </motion.span>
            <AnimatePresence>
              {scoreChange !== null && (
                <motion.span
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -24 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute -top-1 right-0 text-xs font-bold text-green-500 pointer-events-none"
                >
                  +{scoreChange.toLocaleString()}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
