'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users } from 'lucide-react';
import { SlideHostProps } from '../types';
import { RatingInput } from '@/components/app/rating-input';

export function RatingInputHost({ slide, presentation, responseCount, playerCount }: SlideHostProps) {
  const metric = slide.ratingMetric || { type: 'stars' as const, min: 1, max: 5 };

  // Find linked describe slide for item title
  const describeSlide = presentation.slides.find(s => s.id === slide.sourceDescribeSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Item';
  const question = metric.question || 'How would you rate this?';

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

      {/* Item Title */}
      <motion.h2
        className="text-3xl font-bold mb-4 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {itemTitle}
      </motion.h2>

      {/* Question Card */}
      <motion.div
        className="w-full max-w-3xl mb-8"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            <h1 className="text-4xl font-bold mb-8">{question}</h1>

            {/* Preview of rating scale */}
            <div className="flex justify-center">
              <RatingInput
                type={metric.type}
                min={metric.min}
                max={metric.max}
                labels={metric.labels}
                value={null}
                onChange={() => {}}
                disabled
                size="lg"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Response Counter */}
      <motion.div
        className="absolute bottom-8 right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="h-5 w-5 mr-2" />
          {responseCount} / {playerCount} rated
        </Badge>
      </motion.div>
    </motion.div>
  );
}
