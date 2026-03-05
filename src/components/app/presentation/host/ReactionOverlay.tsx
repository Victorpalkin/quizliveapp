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
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Convert incoming reactions to floating emojis
  useEffect(() => {
    if (reactions.length === 0) return;

    const now = Date.now();
    const newEmojis: FloatingEmoji[] = [];

    for (const reaction of reactions) {
      if (processedIdsRef.current.has(reaction.id)) continue;
      processedIdsRef.current.add(reaction.id);

      newEmojis.push({
        id: `${reaction.id}-${now}`,
        emoji: reaction.emoji,
        x: 10 + Math.random() * 80,
        size: 1.5 + Math.random() * 1.5,
        drift: -20 + Math.random() * 40,
        createdAt: now,
      });
    }

    if (newEmojis.length > 0) {
      setFloating((prev) => [...prev, ...newEmojis].slice(-30));
    }

    // Cap the processed set to prevent unbounded growth
    if (processedIdsRef.current.size > 200) {
      const ids = Array.from(processedIdsRef.current);
      processedIdsRef.current = new Set(ids.slice(-100));
    }
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
