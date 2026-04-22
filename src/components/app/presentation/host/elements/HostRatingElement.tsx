'use client';

import { motion } from 'motion/react';
import { useResponseCount, useElementResponses, useDynamicItems } from '@/firebase/presentation';
import { Star, Loader2 } from 'lucide-react';
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
  const { items: dynamicItems, isLoading } = useDynamicItems(gameId, element.dynamicItemsSource);

  if (!config) return null;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Resolve items
  const staticItems = config.items && config.items.length > 0 ? config.items : null;
  const resolvedItems = dynamicItems || staticItems;
  const isMultiItem = resolvedItems !== null && resolvedItems.length > 1;

  // --- Multi-item mode ---
  if (isMultiItem) {
    const items = resolvedItems!;

    // Compute per-item averages from ratingValues
    const itemAverages = items.map((item) => {
      const values = responses
        .map((r) => r.ratingValues?.[item.id])
        .filter((v): v is number => v !== undefined && v !== null);
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { ...item, avg, count: values.length };
    });

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        {config.question && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-center mb-4"
          >
            {config.question}
          </motion.p>
        )}

        <div className="w-full max-w-md space-y-3 mb-4">
          {itemAverages.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 glass rounded-lg p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.text}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {config.metricType === 'stars' && (
                  <Star className={`h-4 w-4 ${item.count > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                )}
                <span className="font-bold text-lg min-w-[2.5rem] text-right">
                  {item.count > 0 ? item.avg.toFixed(1) : '-'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

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

  // --- Single-item mode ---
  const singleItem = resolvedItems?.[0];
  const title = singleItem?.text || config.itemTitle;
  const description = singleItem?.description || config.itemDescription;

  // Calculate live average from either ratingValues (single item) or ratingValue (legacy)
  const ratings = responses
    .map((r) => {
      if (singleItem && r.ratingValues?.[singleItem.id] !== undefined) {
        return r.ratingValues[singleItem.id];
      }
      return r.ratingValue;
    })
    .filter((v): v is number => v !== undefined && v !== null);
  const average = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-center mb-2"
      >
        {title}
      </motion.h2>
      {description && (
        <p className="text-muted-foreground text-center mb-4">{description}</p>
      )}
      {config.question && (
        <p className="text-lg text-center mb-6">{config.question}</p>
      )}

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
