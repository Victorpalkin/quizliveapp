'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useResponses, useDynamicItems } from '@/firebase/presentation';
import { Star, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PlayerRatingProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

const EMOJIS = ['😡', '😞', '😐', '🙂', '😍'];

function RatingInput({
  metricType,
  min,
  max,
  value,
  onChange,
}: {
  metricType: 'stars' | 'slider' | 'emoji';
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  if (metricType === 'stars') {
    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length: max - min + 1 }, (_, i) => {
          const starValue = min + i;
          const isFilled = value !== null && starValue <= value;
          return (
            <motion.button
              key={starValue}
              onClick={() => onChange(starValue)}
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
    );
  }

  if (metricType === 'slider') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 space-y-2"
      >
        <Slider
          value={[value ?? Math.floor((min + max) / 2)]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <motion.span
            key={value}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-foreground"
          >
            {value ?? '-'}
          </motion.span>
          <span>{max}</span>
        </div>
      </motion.div>
    );
  }

  // emoji
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const emojiValue = min + i;
        const emojiIndex = Math.floor(i / (max - min + 1) * EMOJIS.length);
        const isSelected = value === emojiValue;
        return (
          <motion.button
            key={emojiValue}
            onClick={() => onChange(emojiValue)}
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
  );
}

export function PlayerRating({ element, gameId, playerId, playerName, onSubmitted }: PlayerRatingProps) {
  const config = element.ratingConfig;
  const { submitResponse } = useResponses(gameId);
  const { items: dynamicItems, isLoading } = useDynamicItems(gameId, element.dynamicItemsSource);

  const [singleValue, setSingleValue] = useState<number | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!config) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Resolve items: dynamic > static items > legacy single item
  const staticItems = config.items && config.items.length > 0 ? config.items : null;
  const resolvedItems = dynamicItems || staticItems;
  const isMultiItem = resolvedItems !== null && resolvedItems.length > 1;

  // --- Multi-item mode ---
  if (isMultiItem) {
    const items = resolvedItems!;
    const currentItem = items[currentItemIndex];
    const currentValue = ratingValues[currentItem.id] ?? null;
    const ratedCount = items.filter((item) => ratingValues[item.id] !== undefined).length;
    const allComplete = ratedCount === items.length;

    const handleRate = (itemId: string, value: number) => {
      setRatingValues((prev) => ({ ...prev, [itemId]: value }));
    };

    const handleSubmit = async () => {
      if (!allComplete || submitting) return;
      setSubmitting(true);
      try {
        await submitResponse({
          elementId: element.id,
          slideId: element.id,
          playerId,
          playerName,
          ratingValues,
        });
        onSubmitted();
      } catch {
        // Keep state on error
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* Question */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {config.question && <p className="text-lg">{config.question}</p>}
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setCurrentItemIndex(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentItemIndex
                    ? 'bg-primary scale-125'
                    : ratingValues[item.id] !== undefined
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            {ratedCount}/{items.length}
          </span>
        </div>

        {/* Current item */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="glass rounded-xl p-4 text-center">
              <h3 className="text-lg font-semibold">{currentItem.text}</h3>
              {currentItem.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentItem.description}</p>
              )}
            </div>

            <RatingInput
              metricType={config.metricType}
              min={config.min}
              max={config.max}
              value={currentValue}
              onChange={(v) => handleRate(currentItem.id, v)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentItemIndex((i) => i - 1)}
            disabled={currentItemIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {currentItemIndex < items.length - 1 ? (
            <Button
              onClick={() => setCurrentItemIndex((i) => i + 1)}
              disabled={currentValue === null}
              className="flex-1"
              variant="gradient"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allComplete || submitting}
              className="flex-1"
              variant="gradient"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Submit All
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Single-item mode (legacy or 1 resolved item) ---
  const singleItem = resolvedItems?.[0];
  const title = singleItem?.text || config.itemTitle;
  const description = singleItem?.description || config.itemDescription;

  const handleSubmit = async () => {
    if (singleValue === null || submitting) return;
    setSubmitting(true);
    try {
      if (singleItem) {
        await submitResponse({
          elementId: element.id,
          slideId: element.id,
          playerId,
          playerName,
          ratingValues: { [singleItem.id]: singleValue },
        });
      } else {
        await submitResponse({
          elementId: element.id,
          slideId: element.id,
          playerId,
          playerName,
          ratingValue: singleValue,
        });
      }
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
        <h2 className="text-xl font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {config.question && (
          <p className="text-lg mt-3">{config.question}</p>
        )}
      </motion.div>

      <RatingInput
        metricType={config.metricType}
        min={config.min}
        max={config.max}
        value={singleValue}
        onChange={setSingleValue}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={singleValue === null || submitting}
          className="w-full"
          variant="gradient"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </motion.div>
    </div>
  );
}
