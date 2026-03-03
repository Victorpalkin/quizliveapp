'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Flame } from 'lucide-react';

interface StreakBannerProps {
  playerName: string;
  streak: number;
}

const streakGradient = (streak: number) => {
  if (streak >= 10) return 'from-purple-500 via-pink-500 to-red-500';
  if (streak >= 5) return 'from-orange-500 to-red-500';
  return 'from-yellow-500 to-orange-500';
};

export function StreakBanner({ playerName, streak }: StreakBannerProps) {
  return (
    <AnimatePresence>
      {streak >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30"
        >
          <div className={`bg-gradient-to-r ${streakGradient(streak)} backdrop-blur-xl text-white px-6 py-2.5 rounded-full font-bold text-lg shadow-2xl flex items-center gap-2 border border-white/20`}>
            <Flame className="h-5 w-5" />
            {playerName} is on a {streak}-streak!
            <Flame className="h-5 w-5" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
