'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { AnswerButton } from '@/components/app/answer-button';
import { CircularTimer } from '@/components/app/circular-timer';
import { SlidePlayerProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function QuizPlayer({ slide, game, playerId, hasResponded, onSubmit, slideIndex }: SlidePlayerProps) {
  const app = useFirebaseApp();
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const question = slide.question as SingleChoiceQuestion | undefined;
  const timeLimit = question?.timeLimit || 20;

  // Countdown timer state
  const [time, setTime] = useState(timeLimit);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track remaining time for scoring
  const startTimeRef = useRef<number>(Date.now());

  // Reset timer and state when slide changes
  useEffect(() => {
    startTimeRef.current = Date.now();
    setTime(timeLimit);
    setSelectedIndex(null);
    setTimedOut(false);
    setIsSubmitting(false);
  }, [slide.id, timeLimit]);

  // Countdown effect
  useEffect(() => {
    // Don't run timer if already responded or timed out
    if (hasResponded || timedOut) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          // Time's up!
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [slide.id, hasResponded, timedOut]);

  const handleSelect = useCallback(async (index: number) => {
    if (hasResponded || isSubmitting || timedOut || !app) return;

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSelectedIndex(index);
    setIsSubmitting(true);

    // Use current countdown time for scoring
    const timeRemaining = time;

    try {
      // Call submitAnswer cloud function for server-side scoring
      const functions = getFunctions(app, 'europe-west4');
      const submitAnswer = httpsCallable(functions, 'submitAnswer');

      await submitAnswer({
        gameId: game.id,
        playerId,
        questionIndex: slideIndex, // Slide index = answer key index
        answerIndex: index,
        timeRemaining,
        slideId: slide.id,
        questionType: question?.type || 'single-choice',
        questionTimeLimit: timeLimit,
      });

      // Also call onSubmit to mark as responded (for hasResponded tracking via slideResponses)
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex: index,
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);

      // Show error toast with specific message based on error type
      const firebaseError = error as FirebaseError;
      const errorCode = firebaseError.code?.replace('functions/', '');
      if (errorCode === 'deadline-exceeded') {
        toast({
          variant: 'destructive',
          title: 'Answer Too Late',
          description: 'Your answer was submitted after the time limit.',
        });
      } else if (errorCode === 'failed-precondition') {
        toast({
          variant: 'destructive',
          title: 'Answer Not Accepted',
          description: firebaseError.message || 'The game state changed.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: 'Failed to submit answer. Your score may not be saved.',
        });
      }

      // Still mark as submitted to prevent retries
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        answerIndex: index,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [slide.id, game.id, playerId, slideIndex, question?.type, timeLimit, hasResponded, isSubmitting, timedOut, time, onSubmit, app, toast]);

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No question available</p>
      </div>
    );
  }

  // Timed out view
  if (timedOut) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span className="text-3xl text-white">⏱️</span>
        </motion.div>
        <h2 className="text-2xl font-semibold">Time&apos;s up!</h2>
        <p className="text-muted-foreground mt-2">You ran out of time for this question.</p>
      </motion.div>
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
        <h2 className="text-2xl font-semibold">Answer submitted!</h2>
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
        {timeLimit > 0 && (
          <div className="absolute top-0 right-0">
            <CircularTimer time={time} timeLimit={timeLimit} size={64} />
          </div>
        )}
      </div>

      {/* Image if present */}
      {slide.imageUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4 max-h-48 md:max-h-64">
          <Image
            src={slide.imageUrl}
            alt="Question image"
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
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AnswerButton
              letter={String.fromCharCode(65 + index)}
              text={answer.text}
              selected={selectedIndex === index}
              disabled={isSubmitting || hasResponded || timedOut}
              onClick={() => handleSelect(index)}
              colorIndex={index}
            />
            {/* Loading indicator overlay */}
            {selectedIndex === index && isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
