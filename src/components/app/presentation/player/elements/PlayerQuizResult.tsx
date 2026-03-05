'use client';

import { motion } from 'motion/react';
import { PartyPopper, Frown, Clock, Award, Flame } from 'lucide-react';
import type { QuizResult } from '@/app/play/presentation/[gamePin]/hooks/use-player-state-machine';

interface PlayerQuizResultProps {
  sourceElementId: string;
  getQuizResult: (elementId: string) => QuizResult | null;
  playerScore: number;
  playerStreak: number;
}

export function PlayerQuizResult({
  sourceElementId,
  getQuizResult,
  playerScore,
  playerStreak,
}: PlayerQuizResultProps) {
  const result = getQuizResult(sourceElementId);

  // Player didn't see or answer this quiz
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4"
        >
          <Clock className="h-8 w-8 text-muted-foreground" />
        </motion.div>
        <h2 className="text-lg font-semibold text-muted-foreground">No Answer</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">
          You didn&apos;t answer this question
        </p>
      </div>
    );
  }

  const { isCorrect, points, wasTimeout } = result;

  let iconBg: string;
  let iconColor: string;
  let icon: React.ReactNode;
  let message: string;

  if (isCorrect) {
    iconBg = 'bg-green-500/15';
    iconColor = 'text-green-500';
    icon = <PartyPopper className="h-10 w-10" />;
    message = 'Correct!';
  } else if (wasTimeout) {
    iconBg = 'bg-orange-500/15';
    iconColor = 'text-orange-500';
    icon = <Clock className="h-10 w-10" />;
    message = "Time's Up!";
  } else {
    iconBg = 'bg-destructive/15';
    iconColor = 'text-destructive';
    icon = <Frown className="h-10 w-10" />;
    message = 'Incorrect';
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Result icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className={`w-20 h-20 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}
      >
        <div className={iconColor}>{icon}</div>
      </motion.div>

      {/* Message */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold mb-4"
      >
        {message}
      </motion.h2>

      {/* Points earned */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl px-6 py-4 mb-4"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Points Earned</p>
        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          +{points}
        </p>
      </motion.div>

      {/* Streak */}
      {isCorrect && playerStreak >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-orange-500"
        >
          <Flame className="h-5 w-5" />
          <span className="font-semibold">{playerStreak} in a row!</span>
        </motion.div>
      )}

      {/* Total score */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 mt-4 text-muted-foreground"
      >
        <Award className="h-4 w-4" />
        <span className="text-sm">Total: {playerScore.toLocaleString()} pts</span>
      </motion.div>
    </div>
  );
}
