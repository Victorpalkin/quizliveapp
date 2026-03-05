'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactions } from '@/firebase/presentation';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];

interface ReactionBarProps {
  gameId: string;
  playerId: string;
}

export function ReactionBar({ gameId, playerId }: ReactionBarProps) {
  const { sendReaction } = useReactions(gameId);
  const [sentEmoji, setSentEmoji] = useState<{ emoji: string; key: number } | null>(null);

  const handleSend = useCallback((emoji: string) => {
    sendReaction(playerId, emoji);
    setSentEmoji({ emoji, key: Date.now() });
    setTimeout(() => setSentEmoji(null), 800);
  }, [sendReaction, playerId]);

  return (
    <div className="relative flex items-center justify-center gap-3 px-4 py-3 glass-subtle flex-shrink-0">
      {EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          onClick={() => handleSend(emoji)}
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="text-2xl select-none relative"
        >
          {emoji}
        </motion.button>
      ))}
      <AnimatePresence>
        {sentEmoji && (
          <motion.span
            key={sentEmoji.key}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -40, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute top-0 text-2xl pointer-events-none"
          >
            {sentEmoji.emoji}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
