'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { SlidePlayerProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';

const ANSWER_COLORS = [
  'bg-red-500 hover:bg-red-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-green-500 hover:bg-green-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-orange-500 hover:bg-orange-600',
];

export function QuizPlayer({ slide, hasResponded, onSubmit }: SlidePlayerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const question = slide.question as SingleChoiceQuestion | undefined;

  const handleSelect = useCallback(async (index: number) => {
    if (hasResponded || isSubmitting) return;

    setSelectedIndex(index);
    setIsSubmitting(true);

    try {
      await onSubmit({
        slideId: slide.id,
        playerId: '',  // Will be filled by parent
        playerName: '', // Will be filled by parent
        answerIndex: index,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [slide.id, hasResponded, isSubmitting, onSubmit]);

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
          className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Answer submitted!</h2>
        <p className="text-muted-foreground mt-2">Waiting for results...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col p-4 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Question */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{question.text}</h1>
      </div>

      {/* Answers */}
      <div className="grid gap-3">
        <AnimatePresence mode="wait">
          {question.answers.map((answer, index) => (
            <motion.button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isSubmitting || hasResponded}
              className={`w-full text-left rounded-xl transition-all ${ANSWER_COLORS[index]} text-white disabled:opacity-50`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="bg-transparent border-0 shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-lg font-medium flex-1">{answer.text}</span>
                  {selectedIndex === index && isSubmitting && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </CardContent>
              </Card>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
