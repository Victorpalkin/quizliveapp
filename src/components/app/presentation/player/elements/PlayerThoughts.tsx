'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResponses } from '@/firebase/presentation';
import { Send, X } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PlayerThoughtsProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
  onSubmitted: () => void;
}

export function PlayerThoughts({ element, gameId, playerId, playerName, onSubmitted }: PlayerThoughtsProps) {
  const config = element.thoughtsConfig;
  const { submitResponse } = useResponses(gameId);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!config) return null;

  const maxPerPlayer = config.maxPerPlayer || 3;
  const remaining = maxPerPlayer - thoughts.length;

  const addThought = () => {
    if (!current.trim() || thoughts.length >= maxPerPlayer) return;
    setThoughts((prev) => [...prev, current.trim()]);
    setCurrent('');
  };

  const removeThought = (index: number) => {
    setThoughts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const allThoughts = current.trim()
      ? [...thoughts, current.trim()]
      : thoughts;

    if (allThoughts.length === 0) return;
    setSubmitting(true);

    try {
      await submitResponse({
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        textAnswers: allThoughts,
      });
      onSubmitted();
    } catch {
      // Keep on error
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
        {config.prompt}
      </motion.h2>

      {/* Already added thoughts */}
      {thoughts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {thoughts.map((t, i) => (
              <motion.div
                key={`${t}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
              >
                {t}
                <button
                  onClick={() => removeThought(i)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      {remaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2"
        >
          <Input
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Type your thought..."
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addThought();
              }
            }}
            autoFocus
            className="bg-background/50"
          />
          <Button variant="ghost" size="icon" onClick={addThought} disabled={!current.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Remaining counter */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: maxPerPlayer }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: i < thoughts.length
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted))',
              }}
              className="w-2 h-2 rounded-full"
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining} remaining` : 'Maximum reached'}
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={(thoughts.length === 0 && !current.trim()) || submitting}
        className="w-full"
        variant="gradient"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </Button>
    </div>
  );
}
