'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
import { SlideResultsProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';

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
          const colors = ANSWER_COLOR_GRADIENTS[index % ANSWER_COLOR_GRADIENTS.length];

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
