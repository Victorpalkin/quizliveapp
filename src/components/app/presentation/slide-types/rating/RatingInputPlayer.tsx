'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlidePlayerProps } from '../types';
import { RatingInput } from '@/components/app/rating-input';
import { useToast } from '@/hooks/use-toast';

export function RatingInputPlayer({ slide, presentation, game, playerId, hasResponded, onSubmit }: SlidePlayerProps) {
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const metric = slide.ratingMetric || { type: 'stars' as const, min: 1, max: 5 };

  // Find linked describe slide for item title
  const describeSlide = presentation.slides.find(s => s.id === slide.sourceDescribeSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Item';
  const question = metric.question || 'How would you rate this?';

  const handleSubmit = useCallback(async () => {
    if (selectedRating === null || hasResponded || isSubmitting) return;

    // Validate rating is within bounds
    if (selectedRating < metric.min || selectedRating > metric.max) {
      toast({
        variant: 'destructive',
        title: 'Invalid Rating',
        description: `Please select a rating between ${metric.min} and ${metric.max}.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        slideId: slide.id,
        playerId: '',
        playerName: '',
        rating: selectedRating,
      });
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your rating. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRating, hasResponded, isSubmitting, onSubmit, slide.id, metric.min, metric.max, toast]);

  // Already submitted view
  if (hasResponded) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Rating submitted!</h2>
        <p className="text-muted-foreground mt-2">Waiting for results...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col p-4 gap-6 max-w-lg mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Item Title */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full mb-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{itemTitle}</span>
        </div>
      </motion.div>

      {/* Question */}
      <motion.h1
        className="text-2xl font-bold text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {question}
      </motion.h1>

      {/* Rating Input */}
      <motion.div
        className="flex justify-center py-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <RatingInput
          type={metric.type}
          min={metric.min}
          max={metric.max}
          labels={metric.labels}
          value={selectedRating}
          onChange={setSelectedRating}
          disabled={isSubmitting}
          size="lg"
        />
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleSubmit}
          disabled={selectedRating === null || isSubmitting}
          className="w-full h-14 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 transition-opacity"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Rating
              {selectedRating !== null && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                  {selectedRating} / {metric.max}
                </span>
              )}
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
