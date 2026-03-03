'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useResponses } from '@/firebase/presentation';
import { Star } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PlayerRatingProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

const EMOJIS = ['😡', '😞', '😐', '🙂', '😍'];

export function PlayerRating({ element, gameId, playerId, playerName, onSubmitted }: PlayerRatingProps) {
  const config = element.ratingConfig;
  const { submitResponse } = useResponses(gameId);
  const [value, setValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!config) return null;

  const handleSubmit = async () => {
    if (value === null || submitting) return;
    setSubmitting(true);

    try {
      await submitResponse({
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        ratingValue: value,
      });
      onSubmitted();
    } catch {
      // Keep on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-xl font-bold">{config.itemTitle}</h2>
        {config.itemDescription && (
          <p className="text-sm text-muted-foreground mt-1">{config.itemDescription}</p>
        )}
        {config.question && (
          <p className="text-lg mt-3">{config.question}</p>
        )}
      </motion.div>

      {/* Stars */}
      {config.metricType === 'stars' && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: config.max - config.min + 1 }, (_, i) => {
            const starValue = config.min + i;
            const isFilled = value !== null && starValue <= value;
            return (
              <motion.button
                key={starValue}
                onClick={() => setValue(starValue)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.15 }}
              >
                <motion.div
                  animate={isFilled ? {
                    scale: [1, 1.3, 1],
                    filter: 'drop-shadow(0 0 6px rgb(234 179 8 / 0.6))',
                  } : {
                    scale: 1,
                    filter: 'drop-shadow(0 0 0px transparent)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Star
                    className={`h-10 w-10 transition-colors duration-200 ${
                      isFilled
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Slider */}
      {config.metricType === 'slider' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 space-y-2"
        >
          <Slider
            value={[value ?? Math.floor((config.min + config.max) / 2)]}
            onValueChange={([v]) => setValue(v)}
            min={config.min}
            max={config.max}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{config.min}</span>
            <motion.span
              key={value}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold text-foreground"
            >
              {value ?? '-'}
            </motion.span>
            <span>{config.max}</span>
          </div>
        </motion.div>
      )}

      {/* Emoji */}
      {config.metricType === 'emoji' && (
        <div className="flex justify-center gap-3">
          {Array.from({ length: config.max - config.min + 1 }, (_, i) => {
            const emojiValue = config.min + i;
            const emojiIndex = Math.floor(i / (config.max - config.min + 1) * EMOJIS.length);
            const isSelected = value === emojiValue;
            return (
              <motion.button
                key={emojiValue}
                onClick={() => setValue(emojiValue)}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring' }}
                whileHover={{ scale: 1.2, y: -4 }}
                whileTap={{ scale: 0.9 }}
                className={`text-3xl transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-primary rounded-full p-1 shadow-lg shadow-primary/20'
                    : 'p-1'
                }`}
              >
                {EMOJIS[emojiIndex] || '🙂'}
              </motion.button>
            );
          })}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={value === null || submitting}
          className="w-full"
          variant="gradient"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </motion.div>
    </div>
  );
}
