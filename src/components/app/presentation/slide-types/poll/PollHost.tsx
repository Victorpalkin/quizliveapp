'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideHostProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

// 8 subtle color gradients matching app design system
const colorGradients = [
  {
    bg: 'from-purple-500/15 to-purple-500/8',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'from-purple-500 to-purple-600',
  },
  {
    bg: 'from-blue-500/15 to-blue-500/8',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'from-blue-500 to-blue-600',
  },
  {
    bg: 'from-green-500/15 to-green-500/8',
    border: 'border-green-200 dark:border-green-900',
    badge: 'from-green-500 to-green-600',
  },
  {
    bg: 'from-amber-500/15 to-amber-500/8',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'from-amber-500 to-amber-600',
  },
  {
    bg: 'from-rose-500/15 to-rose-500/8',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'from-rose-500 to-rose-600',
  },
  {
    bg: 'from-cyan-500/15 to-cyan-500/8',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'from-cyan-500 to-cyan-600',
  },
  {
    bg: 'from-indigo-500/15 to-indigo-500/8',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'from-indigo-500 to-indigo-600',
  },
  {
    bg: 'from-pink-500/15 to-pink-500/8',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'from-pink-500 to-pink-600',
  },
];

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollHost({ slide, responseCount, playerCount }: SlideHostProps) {
  const question = slide.question as PollQuestion | undefined;
  const isMultiple = question?.type === 'poll-multiple';

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No question configured</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Question Card */}
      <motion.div
        className="w-full max-w-4xl mb-8"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            <h1 className="text-4xl font-bold">{question.text}</h1>
            {isMultiple && (
              <p className="text-lg text-muted-foreground mt-2">
                Select all that apply
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Answers Grid - responsive */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.answers.map((answer, index) => {
          const colors = colorGradients[index % colorGradients.length];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
            >
              <div
                className={cn(
                  'p-6 rounded-xl shadow-md border',
                  `bg-gradient-to-r ${colors.bg}`,
                  colors.border,
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Letter Badge */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
                    'text-xl font-semibold text-white',
                    `bg-gradient-to-br ${colors.badge}`,
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>

                  {/* Answer Text */}
                  <span className="text-xl font-medium">{answer.text}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Response Counter */}
      <motion.div
        className="absolute bottom-8 right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {responseCount} / {playerCount} voted
        </Badge>
      </motion.div>
    </motion.div>
  );
}
