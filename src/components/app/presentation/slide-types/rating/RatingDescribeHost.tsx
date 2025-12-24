'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { SlideHostProps } from '../types';

export function RatingDescribeHost({ slide }: SlideHostProps) {
  const ratingItem = slide.ratingItem || { title: 'Untitled Item', description: '' };

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Icon */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Star className="h-10 w-10 text-white fill-white" />
        </div>
      </motion.div>

      {/* Title & Description Card */}
      <motion.div
        className="w-full max-w-4xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            <h1 className="text-5xl font-bold mb-4">{ratingItem.title}</h1>
            {ratingItem.description && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {ratingItem.description}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Hint */}
      <motion.p
        className="mt-8 text-lg text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Presenting item for rating...
      </motion.p>
    </motion.div>
  );
}
