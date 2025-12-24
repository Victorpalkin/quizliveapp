'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
import { SlideHostProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';

export function QuizHost({ slide, responseCount, playerCount }: SlideHostProps) {
  const question = slide.question as SingleChoiceQuestion | undefined;

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
            {slide.imageUrl && (
              <div className="relative w-full aspect-video mt-6 rounded-lg overflow-hidden">
                <Image
                  src={slide.imageUrl}
                  alt="Question image"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Answers Grid - responsive */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.answers.map((answer, index) => {
          const colors = ANSWER_COLOR_GRADIENTS[index % ANSWER_COLOR_GRADIENTS.length];

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
          {responseCount} / {playerCount} answered
        </Badge>
      </motion.div>
    </motion.div>
  );
}
