'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SlideResultsProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

// 8 subtle color gradients matching app design system
const colorGradients = [
  {
    bg: 'from-purple-500/15 to-purple-500/8',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'from-purple-500 to-purple-600',
    bar: 'from-purple-500 to-purple-600',
  },
  {
    bg: 'from-blue-500/15 to-blue-500/8',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'from-blue-500 to-blue-600',
    bar: 'from-blue-500 to-blue-600',
  },
  {
    bg: 'from-green-500/15 to-green-500/8',
    border: 'border-green-200 dark:border-green-900',
    badge: 'from-green-500 to-green-600',
    bar: 'from-green-500 to-green-600',
  },
  {
    bg: 'from-amber-500/15 to-amber-500/8',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'from-amber-500 to-amber-600',
    bar: 'from-amber-500 to-amber-600',
  },
  {
    bg: 'from-rose-500/15 to-rose-500/8',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'from-rose-500 to-rose-600',
    bar: 'from-rose-500 to-rose-600',
  },
  {
    bg: 'from-cyan-500/15 to-cyan-500/8',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'from-cyan-500 to-cyan-600',
    bar: 'from-cyan-500 to-cyan-600',
  },
  {
    bg: 'from-indigo-500/15 to-indigo-500/8',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'from-indigo-500 to-indigo-600',
    bar: 'from-indigo-500 to-indigo-600',
  },
  {
    bg: 'from-pink-500/15 to-pink-500/8',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'from-pink-500 to-pink-600',
    bar: 'from-pink-500 to-pink-600',
  },
];

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollResults({ slide, responses }: SlideResultsProps) {
  const question = slide.question as PollQuestion | undefined;
  const isMultiple = question?.type === 'poll-multiple';

  const distribution = useMemo(() => {
    if (!question) return [];

    const counts = question.answers.map(() => 0);

    responses.forEach((response) => {
      if (isMultiple && response.answerIndices) {
        // Multiple choice - count each selected option
        response.answerIndices.forEach((idx) => {
          if (idx < counts.length) {
            counts[idx]++;
          }
        });
      } else if (response.answerIndex !== undefined && response.answerIndex < counts.length) {
        // Single choice
        counts[response.answerIndex]++;
      }
    });

    // For multiple choice, total votes can exceed number of responses
    const totalVotes = counts.reduce((sum, c) => sum + c, 0);
    const maxCount = Math.max(...counts, 1);

    return question.answers.map((answer, index) => ({
      text: answer.text,
      count: counts[index],
      percentage: totalVotes > 0 ? (counts[index] / totalVotes) * 100 : 0,
      relativeWidth: (counts[index] / maxCount) * 100,
    }));
  }, [question, responses, isMultiple]);

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Question */}
      <Card className="w-full max-w-4xl mb-8 bg-card/95 backdrop-blur">
        <CardContent className="p-8 text-center">
          <h1 className="text-3xl font-bold">{question.text}</h1>
        </CardContent>
      </Card>

      {/* Results Bars */}
      <div className="w-full max-w-4xl space-y-4">
        {distribution.map((item, index) => {
          const colors = colorGradients[index % colorGradients.length];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <div className="flex items-center gap-4">
                {/* Answer label */}
                <div className="flex-shrink-0 w-48 flex items-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white',
                      `bg-gradient-to-br ${colors.badge}`,
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="font-medium truncate">{item.text}</span>
                </div>

                {/* Bar */}
                <div className={cn(
                  'flex-1 h-12 rounded-lg overflow-hidden relative',
                  `bg-gradient-to-r ${colors.bg}`,
                  colors.border,
                  'border',
                )}>
                  <motion.div
                    className={cn(
                      'h-full rounded-lg',
                      `bg-gradient-to-r ${colors.bar}`,
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.relativeWidth}%` }}
                    transition={{
                      delay: 0.3 + index * 0.15,
                      type: 'spring',
                      stiffness: 100,
                      damping: 15,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-4">
                    <span className="font-bold text-lg">
                      {item.count} ({Math.round(item.percentage)}%)
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total responses */}
      <motion.p
        className="mt-8 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        {isMultiple && distribution.reduce((sum, d) => sum + d.count, 0) > responses.length && (
          <span className="ml-2">
            ({distribution.reduce((sum, d) => sum + d.count, 0)} total votes)
          </span>
        )}
      </motion.p>
    </motion.div>
  );
}
