'use client';

import { motion } from 'motion/react';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponseCount, useElementResponses } from '@/firebase/presentation';
import type { SlideElement } from '@/lib/types';

interface HostPollElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostPollElement({ element, gameId, playerCount }: HostPollElementProps) {
  const config = element.pollConfig;
  const count = useResponseCount(gameId, element.id);
  const responses = useElementResponses(gameId, element.id);

  if (!config) return null;

  // Calculate vote counts per option from live responses
  const voteCounts = config.options.map((_, i) =>
    responses.filter((r) =>
      r.answerIndex === i || (r.answerIndices && r.answerIndices.includes(i))
    ).length
  );

  const maxVotes = Math.max(...voteCounts, 1);

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-4 flex-shrink-0"
      >
        {config.question}
      </motion.h2>

      {/* Options as bars */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        {config.options.map((opt, i) => {
          const pct = maxVotes > 0 ? (voteCounts[i] / maxVotes) * 100 : 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-medium w-32 text-right truncate">{opt.text}</span>
              <div className="flex-1 h-10 bg-muted/50 rounded-lg overflow-hidden">
                <motion.div
                  className="h-full rounded-lg flex items-center justify-end pr-2"
                  animate={{ width: `${Math.max(pct, voteCounts[i] > 0 ? 8 : 0)}%` }}
                  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
                >
                  {voteCounts[i] > 0 && (
                    <span className="text-xs font-bold text-white">
                      {voteCounts[i]}
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Response counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground text-center mt-3 flex-shrink-0"
      >
        {count} / {playerCount} voted
      </motion.div>
    </div>
  );
}
