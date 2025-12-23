'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlidePlayerProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

// 8 subtle color gradients matching app design system
const colorGradients = [
  {
    bg: 'from-purple-500/15 to-purple-500/8',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'from-purple-500 to-purple-600',
    selectedBg: 'from-purple-500/20 to-transparent',
  },
  {
    bg: 'from-blue-500/15 to-blue-500/8',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'from-blue-500 to-blue-600',
    selectedBg: 'from-blue-500/20 to-transparent',
  },
  {
    bg: 'from-green-500/15 to-green-500/8',
    border: 'border-green-200 dark:border-green-900',
    badge: 'from-green-500 to-green-600',
    selectedBg: 'from-green-500/20 to-transparent',
  },
  {
    bg: 'from-amber-500/15 to-amber-500/8',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'from-amber-500 to-amber-600',
    selectedBg: 'from-amber-500/20 to-transparent',
  },
  {
    bg: 'from-rose-500/15 to-rose-500/8',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'from-rose-500 to-rose-600',
    selectedBg: 'from-rose-500/20 to-transparent',
  },
  {
    bg: 'from-cyan-500/15 to-cyan-500/8',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'from-cyan-500 to-cyan-600',
    selectedBg: 'from-cyan-500/20 to-transparent',
  },
  {
    bg: 'from-indigo-500/15 to-indigo-500/8',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'from-indigo-500 to-indigo-600',
    selectedBg: 'from-indigo-500/20 to-transparent',
  },
  {
    bg: 'from-pink-500/15 to-pink-500/8',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'from-pink-500 to-pink-600',
    selectedBg: 'from-pink-500/20 to-transparent',
  },
];

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollPlayer({ slide, hasResponded, onSubmit }: SlidePlayerProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const question = slide.question as PollQuestion | undefined;
  const isMultiple = question?.type === 'poll-multiple';

  const handleSingleSelect = useCallback(async (index: number) => {
    if (hasResponded || isSubmitting) return;

    setSelectedIndices([index]);
    setIsSubmitting(true);

    try {
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex: index,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [slide.id, hasResponded, isSubmitting, onSubmit]);

  const handleMultipleToggle = useCallback((index: number) => {
    if (hasResponded || isSubmitting) return;

    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }, [hasResponded, isSubmitting]);

  const handleMultipleSubmit = useCallback(async () => {
    if (hasResponded || isSubmitting || selectedIndices.length === 0) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndices: selectedIndices,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [slide.id, hasResponded, isSubmitting, selectedIndices, onSubmit]);

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No question available</p>
      </div>
    );
  }

  // Already answered view
  if (hasResponded) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Vote submitted!</h2>
        <p className="text-muted-foreground mt-2">Waiting for results...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col p-4 gap-4 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Question */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{question.text}</h1>
        {isMultiple && (
          <p className="text-muted-foreground mt-1">Select all that apply</p>
        )}
      </div>

      {/* Answers - responsive grid */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
        <AnimatePresence mode="wait">
          {question.answers.map((answer, index) => {
            const colors = colorGradients[index % colorGradients.length];
            const isSelected = selectedIndices.includes(index);

            return (
              <motion.button
                key={index}
                onClick={() => isMultiple ? handleMultipleToggle(index) : handleSingleSelect(index)}
                disabled={isSubmitting || hasResponded}
                className={cn(
                  // Base styles
                  'w-full p-6 rounded-xl text-left',
                  'shadow-md transition-all duration-300',
                  'border',

                  // Color gradient background and border
                  `bg-gradient-to-r ${colors.bg}`,
                  colors.border,

                  // Interactive states
                  !isSubmitting && 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
                  isSubmitting && !isSelected && 'opacity-50 cursor-not-allowed',

                  // Selected state
                  isSelected && [
                    'border-l-4',
                    `bg-gradient-to-r ${colors.selectedBg}`,
                    'shadow-xl',
                  ],
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  {/* Letter Badge */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
                    'text-xl font-semibold transition-all duration-300',
                    isSelected
                      ? `bg-gradient-to-br ${colors.badge} text-white scale-110`
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {isSelected ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>

                  {/* Answer Text */}
                  <span className={cn(
                    'flex-1 text-lg transition-all duration-300',
                    isSelected ? 'font-medium' : 'font-normal'
                  )}>
                    {answer.text}
                  </span>

                  {/* Loading indicator for single choice */}
                  {!isMultiple && isSelected && isSubmitting && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Submit button for multiple choice */}
      {isMultiple && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          <Button
            onClick={handleMultipleSubmit}
            disabled={isSubmitting || selectedIndices.length === 0}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Vote
                {selectedIndices.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                    {selectedIndices.length} selected
                  </span>
                )}
              </>
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
