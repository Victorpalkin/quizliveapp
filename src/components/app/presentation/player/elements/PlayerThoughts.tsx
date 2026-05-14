'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResponses } from '@/firebase/presentation';
import { Send, CheckCircle, Loader2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface PlayerThoughtsProps {
  element: SlideElement;
  gameId: string;
  playerId: string;
  playerName: string;
}

export function PlayerThoughts({ element, gameId, playerId, playerName }: PlayerThoughtsProps) {
  const config = element.thoughtsConfig;
  const { submitResponse } = useResponses(gameId);
  const [sentThoughts, setSentThoughts] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!config) return null;

  const maxPerPlayer = config.maxPerPlayer || 3;
  const remaining = maxPerPlayer - sentThoughts.length;

  const handleSend = async () => {
    const text = current.trim();
    if (!text || remaining <= 0 || submitting) return;

    const newThoughts = [...sentThoughts, text];
    setCurrent('');
    setSubmitting(true);

    try {
      await submitResponse({
        elementId: element.id,
        slideId: element.id,
        playerId,
        playerName,
        textAnswers: newThoughts,
      });
      setSentThoughts(newThoughts);
      setShowSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setShowSuccess(false), 1500);
    } catch {
      setCurrent(text);
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
                handleSend();
              }
            }}
            autoFocus
            className="bg-background/50"
            disabled={submitting}
          />
          <Button
            onClick={handleSend}
            disabled={!current.trim() || submitting || showSuccess}
            className={`transition-all ${showSuccess ? 'bg-green-500 hover:bg-green-500' : ''}`}
            variant={showSuccess ? 'default' : 'ghost'}
            size="icon"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: maxPerPlayer }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                backgroundColor: i < sentThoughts.length
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

      {sentThoughts.length > 0 && (
        <div className="space-y-2">
          {sentThoughts.map((t, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex items-center gap-2 p-2 bg-muted rounded-lg"
            >
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm">{t}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
