'use client';

import { motion } from 'motion/react';
import { useResponseCount, useElementResponses } from '@/firebase/presentation';
import { Star } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface HostRatingElementProps {
  element: SlideElement;
  gameId: string;
  playerCount: number;
}

export function HostRatingElement({ element, gameId, playerCount }: HostRatingElementProps) {
  const config = element.ratingConfig;
  const count = useResponseCount(gameId, element.id);
  const responses = useElementResponses(gameId, element.id);

  if (!config) return null;

  // Calculate live average
  const ratings = responses
    .map((r) => r.ratingValue)
    .filter((v): v is number => v !== undefined && v !== null);
  const average = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-2"
      >
        {config.itemTitle}
      </motion.h2>
      {config.itemDescription && (
        <p className="text-muted-foreground text-center mb-4">{config.itemDescription}</p>
      )}
      {config.question && (
        <p className="text-lg text-center mb-6">{config.question}</p>
      )}

      {/* Live average display */}
      {ratings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 text-center"
        >
          <motion.span
            key={average.toFixed(1)}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent"
          >
            {average.toFixed(1)}
          </motion.span>
        </motion.div>
      )}

      {/* Rating display */}
      {config.metricType === 'stars' && (
        <div className="flex gap-2 mb-4">
          {Array.from({ length: config.max }, (_, i) => {
            const starValue = i + 1;
            const filled = average >= starValue;
            const partial = !filled && average > i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <Star
                  className={`h-10 w-10 transition-all duration-500 ${
                    filled
                      ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]'
                      : partial
                        ? 'text-yellow-500/50 fill-yellow-500/30'
                        : 'text-muted-foreground/20'
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Response counter */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-muted-foreground"
      >
        {count} / {playerCount} rated
      </motion.p>
    </div>
  );
}
