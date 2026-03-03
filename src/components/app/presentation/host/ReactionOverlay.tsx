'use client';

import { useEffect, useState, useRef } from 'react';
import { useReactions } from '@/firebase/presentation';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
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
      createdAt: Date.now(),
    };

    setFloating((prev) => [...prev.slice(-20), newEmoji]);
  }, [reactions]);

  // Clean up old emojis
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 3000;
      setFloating((prev) => prev.filter((f) => f.createdAt > cutoff));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {floating.map((f) => (
        <div
          key={f.id}
          className="absolute text-3xl animate-bounce"
          style={{
            left: `${f.x}%`,
            bottom: 0,
            animation: 'float-up 3s ease-out forwards',
          }}
        >
          {f.emoji}
        </div>
      ))}

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
