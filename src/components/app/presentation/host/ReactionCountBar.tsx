'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useReactionCounts } from '@/firebase/presentation';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];

interface ReactionCountBarProps {
  gameId: string;
}

export function ReactionCountBar({ gameId }: ReactionCountBarProps) {
  const counts = useReactionCounts(gameId);

  const visible = EMOJIS.filter((e) => (counts.get(e) ?? 0) > 0);
  if (visible.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-full bg-black/30 backdrop-blur-sm">
        <AnimatePresence>
          {visible.map((emoji) => (
            <motion.div
              key={emoji}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1"
            >
              <span className="text-lg">{emoji}</span>
              <motion.span
                key={counts.get(emoji)}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-sm font-semibold text-white min-w-[1.25rem] text-center"
              >
                {counts.get(emoji)}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
