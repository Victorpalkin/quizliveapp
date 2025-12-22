'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { SlideHostProps } from '../types';
import { SingleChoiceQuestion } from '@/lib/types';

const ANSWER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
];

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
          </CardContent>
        </Card>
      </motion.div>

      {/* Answers Grid */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-4">
        {question.answers.map((answer, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
          >
            <Card
              className={`${ANSWER_COLORS[index]} text-white overflow-hidden`}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-xl font-medium">{answer.text}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
