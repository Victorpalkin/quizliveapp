'use client';

import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { SlidePlayerProps } from '../types';

export function RatingResultsPlayer({ slide, presentation }: SlidePlayerProps) {
  const sourceSlideId = slide.sourceSlideId || '';

  // Find linked describe slide for item title
  const sourceSlide = presentation.slides.find(s => s.id === sourceSlideId);
  const describeSlide = presentation.slides.find(s => s.id === sourceSlide?.sourceDescribeSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Item';

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

      {/* Message */}
      <h2 className="text-2xl font-bold mb-2">Results: {itemTitle}</h2>
      <p className="text-muted-foreground">
        Check the main screen to see the rating results!
      </p>
    </motion.div>
  );
}
