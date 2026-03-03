'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResponses } from '@/firebase/presentation';
import { Send } from 'lucide-react';
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
      <h2 className="text-xl font-bold text-center">{config.prompt}</h2>

      {/* Already added thoughts */}
      {thoughts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {thoughts.map((t, i) => (
            <div key={i} className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
              {t}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {remaining > 0 && (
        <div className="flex gap-2">
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
          />
          <Button variant="ghost" size="icon" onClick={addThought} disabled={!current.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {remaining > 0 ? `${remaining} remaining` : 'Maximum reached'}
      </p>

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
