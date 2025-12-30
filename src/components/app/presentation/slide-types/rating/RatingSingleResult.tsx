'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { SlideHostProps } from '../types';
import { RatingDisplay } from '@/components/app/rating-input';
import { useSlideRatings } from '@/firebase/presentation/use-slide-ratings';

/**
 * Single item rating results with detailed distribution bars.
 * Shows one rated item with average, rating display, and distribution.
 */
export function RatingSingleResult({ slide, presentation, game }: SlideHostProps) {
  const sourceSlideId = slide.sourceSlideId || '';

  // Find linked describe slide for item title
  const sourceSlide = presentation.slides.find(s => s.id === sourceSlideId);
  const describeSlide = presentation.slides.find(s => s.id === sourceSlide?.sourceDescribeSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Item';
  const metric = sourceSlide?.ratingMetric || { type: 'stars' as const, min: 1, max: 5 };

  // Fetch ratings for this slide
  const { ratings, loading } = useSlideRatings(game.id, sourceSlideId);

  // Calculate statistics
  const ratingValues = ratings.map(r => r.rating).filter((r): r is number => r !== undefined);
  const totalResponses = ratingValues.length;
  const averageRating = totalResponses > 0
    ? ratingValues.reduce((a, b) => a + b, 0) / totalResponses
    : 0;

  // Calculate distribution
  const distribution: Record<number, number> = {};
  for (let i = metric.min; i <= metric.max; i++) {
    distribution[i] = ratingValues.filter(v => v === i).length;
  }

  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold mb-2">{itemTitle}</h1>
        <p className="text-xl text-muted-foreground">
          {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
        </p>
      </motion.div>

      {/* Average Rating Card */}
      <motion.div
        className="w-full max-w-2xl mb-8"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-12 w-32 bg-muted rounded mx-auto mb-4" />
                <div className="h-8 w-48 bg-muted rounded mx-auto" />
              </div>
            ) : totalResponses > 0 ? (
              <>
                {/* Large average rating */}
                <div className="text-7xl font-bold text-primary mb-4">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-6">
                  <RatingDisplay
                    type={metric.type}
                    value={averageRating}
                    max={metric.max}
                    size="lg"
                    showValue={false}
                  />
                </div>

                {/* Distribution bars */}
                <div className="space-y-3 max-w-md mx-auto">
                  {Array.from({ length: metric.max - metric.min + 1 }).map((_, i) => {
                    const ratingValue = metric.max - i; // Show highest first
                    const count = distribution[ratingValue] || 0;
                    const percentage = (count / maxCount) * 100;

                    return (
                      <motion.div
                        key={ratingValue}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <div className="flex items-center gap-1 w-16">
                          <span className="font-medium">{ratingValue}</span>
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                          />
                        </div>
                        <div className="w-12 text-right text-muted-foreground">
                          {count}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No ratings yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
