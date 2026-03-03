'use client';

import { useReactions } from '@/firebase/presentation';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];

interface ReactionBarProps {
  gameId: string;
  playerId: string;
}

export function ReactionBar({ gameId, playerId }: ReactionBarProps) {
  const { sendReaction } = useReactions(gameId);

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-background border-t flex-shrink-0">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => sendReaction(playerId, emoji)}
          className="text-2xl hover:scale-125 active:scale-95 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
