'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { AnswerButton } from '@/components/app/answer-button';
import { SlidePlayerProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollPlayer({ slide, game, playerId, hasResponded, onSubmit, slideIndex }: SlidePlayerProps) {
  const app = useFirebaseApp();
  const { toast } = useToast();
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Support both 'question' (standard) and 'pollQuestion' (legacy AI-generated) fields
  const question = (slide.question || (slide as { pollQuestion?: PollQuestion }).pollQuestion) as PollQuestion | undefined;
  const isMultiple = question?.type === 'poll-multiple';

  // Presentation polls have no time limit
  const INFINITE_TIME_LIMIT = 99999;

  const submitPollAnswer = useCallback(async (answerIndex?: number, answerIndices?: number[]) => {
    if (!app) return;

    // No time limit for presentation polls - always send max time remaining
    const timeRemaining = INFINITE_TIME_LIMIT;

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
        questionTimeLimit: INFINITE_TIME_LIMIT,
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

      // Show error toast with specific message based on error type
      const firebaseError = error as FirebaseError;
      const errorCode = firebaseError.code?.replace('functions/', '');
      if (errorCode === 'deadline-exceeded') {
        toast({
          variant: 'destructive',
          title: 'Response Too Late',
          description: 'Your vote was submitted after the time limit.',
        });
      } else if (errorCode === 'failed-precondition') {
        toast({
          variant: 'destructive',
          title: 'Vote Not Accepted',
          description: firebaseError.message || 'The game state changed.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: 'Failed to submit vote. Please try again.',
        });
      }

      // Still mark as submitted to prevent retries
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex,
        answerIndices,
      });
    }
  }, [app, game.id, playerId, slideIndex, slide.id, question?.type, onSubmit, toast]);

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
      {/* Question */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">{question.text}</h1>
        {isMultiple && (
          <p className="text-muted-foreground mt-1">Select all that apply</p>
        )}
      </div>

      {/* Image if present */}
      {slide.imageUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4 max-h-48 md:max-h-64">
          <Image
            src={slide.imageUrl}
            alt="Poll image"
            fill
            className="object-contain"
          />
        </div>
      )}

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
