'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useReactions } from '@/firebase/presentation';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  size: number;
  drift: number;
  createdAt: number;
}

interface ReactionOverlayProps {
  gameId: string;
}

export function ReactionOverlay({ gameId }: ReactionOverlayProps) {
  const { reactions } = useReactions(gameId);
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const lastProcessedRef = useRef<string | null>(null);

  // Convert incoming reactions to floating emojis
  useEffect(() => {
    if (reactions.length === 0) return;

    const latest = reactions[reactions.length - 1];
    if (latest.id === lastProcessedRef.current) return;
    lastProcessedRef.current = latest.id;

    const newEmoji: FloatingEmoji = {
      id: `${latest.id}-${Date.now()}`,
      emoji: latest.emoji,
      x: 10 + Math.random() * 80,
      size: 1.5 + Math.random() * 1.5,
      drift: -20 + Math.random() * 40,
      createdAt: Date.now(),
    };

    setFloating((prev) => [...prev.slice(-20), newEmoji]);
  }, [reactions]);

  // Clean up old emojis
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 3500;
      setFloating((prev) => prev.filter((f) => f.createdAt > cutoff));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Memoize stable emoji list for rendering
  const emojiElements = useMemo(() => floating.map((f) => (
    <div
      key={f.id}
      className="absolute bottom-0 animate-float-up"
      style={{
        left: `${f.x}%`,
        fontSize: `${f.size}rem`,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        ['--tw-translate-x' as string]: `${f.drift}px`,
      }}
    >
      {f.emoji}
    </div>
  )), [floating]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {emojiElements}
    </div>
  );
}
