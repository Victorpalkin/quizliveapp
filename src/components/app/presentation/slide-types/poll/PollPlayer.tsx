'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { AnswerButton } from '@/components/app/answer-button';
import { CircularTimer } from '@/components/app/circular-timer';
import { SlidePlayerProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { useFirebaseApp } from '@/firebase';

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollPlayer({ slide, game, playerId, hasResponded, onSubmit, slideIndex }: SlidePlayerProps) {
  const app = useFirebaseApp();
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const question = slide.question as PollQuestion | undefined;
  const isMultiple = question?.type === 'poll-multiple';
  const timeLimit = question?.timeLimit || 30;

  // Track remaining time for consistency with quiz
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [slide.id]);

  const submitPollAnswer = useCallback(async (answerIndex?: number, answerIndices?: number[]) => {
    if (!app) return;

    // Calculate remaining time
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const timeRemaining = Math.max(0, timeLimit - elapsedSeconds);

    try {
      // Call submitAnswer cloud function for server-side validation
      const functions = getFunctions(app, 'europe-west4');
      const submitAnswer = httpsCallable(functions, 'submitAnswer');

      await submitAnswer({
        gameId: game.id,
        playerId,
        questionIndex: slideIndex,
        answerIndex,
        answerIndices,
        timeRemaining,
        slideId: slide.id,
        questionType: question?.type || 'poll-single',
        questionTimeLimit: timeLimit,
      });

      // Also call onSubmit to mark as responded (for hasResponded tracking)
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex,
        answerIndices,
      });
    } catch (error) {
      console.error('Failed to submit poll answer:', error);
      // Still mark as submitted to prevent retries
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex,
        answerIndices,
      });
    }
  }, [app, game.id, playerId, slideIndex, slide.id, question?.type, timeLimit, onSubmit]);

  const handleSingleSelect = useCallback(async (index: number) => {
    if (hasResponded || isSubmitting) return;

    setSelectedIndices([index]);
    setIsSubmitting(true);

    try {
      await submitPollAnswer(index, undefined);
    } finally {
      setIsSubmitting(false);
    }
  }, [hasResponded, isSubmitting, submitPollAnswer]);

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
      await submitPollAnswer(undefined, selectedIndices);
    } finally {
      setIsSubmitting(false);
    }
  }, [hasResponded, isSubmitting, selectedIndices, submitPollAnswer]);

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
      {/* Question with Timer */}
      <div className="text-center mb-4 relative">
        <h1 className="text-2xl font-bold">{question.text}</h1>
        {isMultiple && (
          <p className="text-muted-foreground mt-1">Select all that apply</p>
        )}
        {timeLimit > 0 && (
          <div className="absolute top-0 right-0">
            <CircularTimer time={timeLimit} timeLimit={timeLimit} size={64} />
          </div>
        )}
      </div>

      {/* Answers - responsive grid using AnswerButton */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
        {question.answers.map((answer, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AnswerButton
              letter={String.fromCharCode(65 + index)}
              text={answer.text}
              selected={selectedIndices.includes(index)}
              disabled={isSubmitting || hasResponded}
              showCheck={isMultiple}
              onClick={() => isMultiple ? handleMultipleToggle(index) : handleSingleSelect(index)}
              colorIndex={index}
            />
          </motion.div>
        ))}
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
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
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
