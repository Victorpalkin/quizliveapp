'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useElementResponses } from '@/firebase/presentation';
import { MessageCircle } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostThoughtsElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostThoughtsElement({ element, gameId, playerCount }: HostThoughtsElementProps) {
  const config = element.thoughtsConfig;
  const responses = useElementResponses(gameId, element.id);

  const recentThoughts = useMemo(() => {
    const all: { key: string; playerName: string; text: string; ts: number }[] = [];

    for (const r of responses) {
      const texts = r.textAnswers || [];
      const ts = r.submittedAt?.toMillis?.() ?? 0;
      texts.forEach((text, idx) => {
        all.push({
          key: `${r.id}-${idx}`,
          playerName: r.playerName,
          text,
          ts,
        });
      });
    }

    all.sort((a, b) => b.ts - a.ts);
    return all.slice(0, 10);
  }, [responses]);

  if (!config) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold text-center mb-4">
        {config.prompt}
      </h2>

      <div className="text-4xl font-bold text-primary mb-1">{responses.length}</div>
      <p className="text-sm text-muted-foreground mb-4">
        responses from {playerCount} player{playerCount !== 1 ? 's' : ''}
      </p>

      {config.showSubmissionStream !== false && recentThoughts.length > 0 && (
        <div className="w-full max-w-lg space-y-1.5 overflow-y-auto max-h-[50%]">
          <AnimatePresence initial={false}>
            {recentThoughts.map((t) => (
              <motion.div
                key={t.key}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 p-2 bg-muted/40 rounded-lg"
              >
                <MessageCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-primary">{t.playerName}</span>
                  <p className="text-sm text-foreground break-words">{t.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
