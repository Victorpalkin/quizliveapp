'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { SlideResultsProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';

const ANSWER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
];

export function QuizResults({ slide, responses }: SlideResultsProps) {
  const question = slide.question as SingleChoiceQuestion | undefined;

  const distribution = useMemo(() => {
    if (!question) return [];

    const counts = question.answers.map(() => 0);
    responses.forEach((response) => {
      if (response.answerIndex !== undefined && response.answerIndex < counts.length) {
        counts[response.answerIndex]++;
      }
    });

    const total = responses.length;
    return question.answers.map((answer, index) => ({
      text: answer.text,
      count: counts[index],
      percentage: total > 0 ? (counts[index] / total) * 100 : 0,
      isCorrect: index === question.correctAnswerIndex,
    }));
  }, [question, responses]);

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No question configured</p>
      </div>
    );
  }

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

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
        {distribution.map((item, index) => (
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
                  className={`w-8 h-8 rounded-full ${ANSWER_COLORS[index]} text-white flex items-center justify-center font-bold text-sm`}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="font-medium truncate">{item.text}</span>
                {item.isCorrect && (
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
              </div>

              {/* Bar */}
              <div className="flex-1 h-12 bg-muted rounded-lg overflow-hidden relative">
                <motion.div
                  className={`h-full ${ANSWER_COLORS[index]} ${
                    item.isCorrect ? 'ring-4 ring-green-400' : ''
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / maxCount) * 100}%` }}
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
        ))}
      </div>

      {/* Total responses */}
      <motion.p
        className="mt-8 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {responses.length} responses
      </motion.p>
    </motion.div>
  );
}
