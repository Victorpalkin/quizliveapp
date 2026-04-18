'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponses, useDynamicItems } from '@/firebase/presentation';
import { Check, Loader2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PlayerPollProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

export function PlayerPoll({ element, gameId, playerId, playerName, onSubmitted }: PlayerPollProps) {
  const config = element.pollConfig;
  const { submitResponse } = useResponses(gameId);
  const { items: aiStepItems, isLoading: loadingDynamic } = useDynamicItems(gameId, element.dynamicItemsSource);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  if (!config) return null;

  if (loadingDynamic) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const options = aiStepItems
    ? aiStepItems.map((item) => ({ text: item.text }))
    : config.options;

  const toggleOption = (index: number) => {
    if (submitting) return;
    if (config.allowMultiple) {
      setSelected((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelected([index]);
    }
  };

  const handleSubmit = async () => {
    if (submitting || selected.length === 0) return;
    setSubmitting(true);

    try {
      await submitResponse({
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        ...(config.allowMultiple
          ? { answerIndices: selected }
          : { answerIndex: selected[0] }),
      });
      onSubmitted();
    } catch {
      // Keep selection on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-bold text-center"
      >
        {config.question}
      </motion.h2>
      {config.allowMultiple && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-muted-foreground text-center"
        >
          Select all that apply
        </motion.p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, i) => {
          const isSelected = selected.includes(i);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <Button
                onClick={() => toggleOption(i)}
                disabled={submitting}
                variant="outline"
                className={`w-full h-12 text-base font-medium justify-start gap-2 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-primary bg-primary/10 shadow-md' : ''
                }`}
              >
                <motion.div
                  animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
                >
                  <AnimatePresence mode="wait">
                    {isSelected ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="letter"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        {String.fromCharCode(65 + i)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                {opt.text}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={selected.length === 0 || submitting}
          className="w-full"
          variant="gradient"
        >
          {submitting ? 'Submitting...' : 'Vote'}
        </Button>
      </motion.div>
    </div>
  );
}
