'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Clock } from 'lucide-react';
import { SlidePlayerProps } from '../types';

export function RatingDescribePlayer({ slide }: SlidePlayerProps) {
  const ratingItem = slide.ratingItem || { title: 'Item', description: '' };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Icon */}
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Star className="h-8 w-8 text-white fill-white" />
      </motion.div>

      {/* Content Card */}
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-3">{ratingItem.title}</h2>
          {ratingItem.description && (
            <p className="text-muted-foreground">{ratingItem.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Waiting message */}
      <motion.div
        className="flex items-center gap-2 mt-6 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Clock className="h-4 w-4" />
        <span>Get ready to rate this item...</span>
      </motion.div>
    </motion.div>
  );
}
