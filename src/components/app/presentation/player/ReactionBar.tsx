'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactions } from '@/firebase/presentation';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];
const COOLDOWN_MS = 2000;

interface ReactionBarProps {
  gameId: string;
  playerId: string;
}

export function ReactionBar({ gameId, playerId }: ReactionBarProps) {
  const { sendReaction } = useReactions(gameId);
  const [sentEmoji, setSentEmoji] = useState<{ emoji: string; key: number } | null>(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [shakenEmoji, setShakenEmoji] = useState<string | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(cooldownTimerRef.current);
  }, []);

  const handleSend = useCallback((emoji: string) => {
    if (cooldownActive) {
      setShakenEmoji(emoji);
      setTimeout(() => setShakenEmoji(null), 400);
      return;
    }

    sendReaction(playerId, emoji);
    setSentEmoji({ emoji, key: Date.now() });
    setTimeout(() => setSentEmoji(null), 800);

    setCooldownActive(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
  }, [sendReaction, playerId, cooldownActive]);

  return (
    <div className="relative flex items-center justify-center gap-3 px-4 py-3 glass-subtle flex-shrink-0 border-t">
      {EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          onClick={() => handleSend(emoji)}
          whileTap={cooldownActive ? {} : { scale: 0.75 }}
          whileHover={cooldownActive ? {} : { scale: 1.15 }}
          animate={
            shakenEmoji === emoji
              ? { x: [0, -4, 4, -3, 3, 0] }
              : { x: 0 }
          }
          transition={
            shakenEmoji === emoji
              ? { duration: 0.35, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 400, damping: 15 }
          }
          className={`text-2xl select-none relative transition-opacity duration-200 ${
            cooldownActive ? 'opacity-40' : 'opacity-100'
          }`}
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
