'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ANSWER_COLORS } from '@/lib/constants';
import { useResponses } from '@/firebase/presentation';
import { Check } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  if (!config) return null;

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
      <h2 className="text-xl font-bold text-center">{config.question}</h2>
      {config.allowMultiple && (
        <p className="text-xs text-muted-foreground text-center">Select all that apply</p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {config.options.map((opt, i) => {
          const isSelected = selected.includes(i);
          return (
            <Button
              key={i}
              onClick={() => toggleOption(i)}
              disabled={submitting}
              variant="outline"
              className={`h-12 text-base font-medium justify-start gap-2 ${
                isSelected ? 'ring-2 ring-primary bg-primary/10' : ''
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }}
              >
                {isSelected ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}
              </div>
              {opt.text}
            </Button>
          );
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={selected.length === 0 || submitting}
        className="w-full"
        variant="gradient"
      >
        {submitting ? 'Submitting...' : 'Vote'}
      </Button>
    </div>
  );
}
