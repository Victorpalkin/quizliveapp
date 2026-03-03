'use client';

import { useState } from 'react';
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
      <div className="text-center">
        <h2 className="text-xl font-bold">{config.itemTitle}</h2>
        {config.itemDescription && (
          <p className="text-sm text-muted-foreground mt-1">{config.itemDescription}</p>
        )}
        {config.question && (
          <p className="text-lg mt-3">{config.question}</p>
        )}
      </div>

      {/* Stars */}
      {config.metricType === 'stars' && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: config.max - config.min + 1 }, (_, i) => {
            const starValue = config.min + i;
            return (
              <button
                key={starValue}
                onClick={() => setValue(starValue)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    value !== null && starValue <= value
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Slider */}
      {config.metricType === 'slider' && (
        <div className="px-4 space-y-2">
          <Slider
            value={[value ?? Math.floor((config.min + config.max) / 2)]}
            onValueChange={([v]) => setValue(v)}
            min={config.min}
            max={config.max}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{config.min}</span>
            <span className="text-lg font-bold text-foreground">{value ?? '-'}</span>
            <span>{config.max}</span>
          </div>
        </div>
      )}

      {/* Emoji */}
      {config.metricType === 'emoji' && (
        <div className="flex justify-center gap-3">
          {Array.from({ length: config.max - config.min + 1 }, (_, i) => {
            const emojiValue = config.min + i;
            const emojiIndex = Math.floor(i / (config.max - config.min + 1) * EMOJIS.length);
            return (
              <button
                key={emojiValue}
                onClick={() => setValue(emojiValue)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  value === emojiValue ? 'scale-125 ring-2 ring-primary rounded-full p-1' : ''
                }`}
              >
                {EMOJIS[emojiIndex] || '🙂'}
              </button>
            );
          })}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={value === null || submitting}
        className="w-full"
        variant="gradient"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </Button>
    </div>
  );
}
