'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { SlideHostProps } from '../types';
import { RatingDisplay } from '@/components/app/rating-input';
import { useRatingAggregates } from '@/firebase/presentation/use-slide-ratings';
import { TILE_COLORS } from '@/lib/colors';

interface RankedItem {
  slideId: string;
  title: string;
  average: number;
  count: number;
  rank: number;
}

export function RatingComparisonResult({ slide, presentation, game }: SlideHostProps) {
  // Get all rating-input slides to compare
  const comparisonSlideIds = slide.comparisonSlideIds || [];

  // If no specific slides selected, get all rating-input slides
  const ratingInputSlides = comparisonSlideIds.length > 0
    ? presentation.slides.filter(s => comparisonSlideIds.includes(s.id))
    : presentation.slides.filter(s => s.type === 'rating-input');

  const slideIds = ratingInputSlides.map(s => s.id);

  // Fetch aggregated ratings for all slides
  const { aggregates, loading } = useRatingAggregates(game.id, slideIds);

  // Build ranked items list
  const rankedItems: RankedItem[] = ratingInputSlides.map(inputSlide => {
    // Find the describe slide for the title
    const describeSlide = presentation.slides.find(s => s.id === inputSlide.sourceDescribeSlideId);
    const title = describeSlide?.ratingItem?.title || 'Untitled';

    const aggregate = aggregates.get(inputSlide.id);

    return {
      slideId: inputSlide.id,
      title,
      average: aggregate?.average || 0,
      count: aggregate?.count || 0,
      rank: 0, // Will be assigned after sorting
    };
  });

  // Sort by average rating (descending) and assign ranks
  rankedItems.sort((a, b) => b.average - a.average);
  rankedItems.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Get metric from first rating-input slide (assumes consistent metrics)
  const firstInputSlide = ratingInputSlides[0];
  const metric = firstInputSlide?.ratingMetric || { type: 'stars' as const, min: 1, max: 5 };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const totalResponses = rankedItems.reduce((sum, item) => sum + item.count, 0);
  const avgResponsesPerItem = rankedItems.length > 0
    ? Math.round(totalResponses / rankedItems.length)
    : 0;

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
        <h1 className="text-4xl font-bold mb-2">Rating Comparison</h1>
        <p className="text-xl text-muted-foreground">
          {rankedItems.length} items ranked by {avgResponsesPerItem} participants
        </p>
      </motion.div>

      {/* Ranked Items List */}
      <div className="w-full max-w-3xl space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-muted rounded mb-2" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                    <div className="h-8 w-16 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        ) : rankedItems.length > 0 ? (
          rankedItems.map((item, index) => (
            <motion.div
              key={item.slideId}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card
                className={`overflow-hidden ${item.rank === 1 ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                  borderLeft: `4px solid ${TILE_COLORS[index % TILE_COLORS.length]}`
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank indicator */}
                    <div className="flex items-center justify-center w-10 h-10">
                      {getRankIcon(item.rank)}
                    </div>

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.count} {item.count === 1 ? 'rating' : 'ratings'}
                      </p>
                    </div>

                    {/* Rating display */}
                    <div className="flex items-center gap-3">
                      <RatingDisplay
                        type={metric.type}
                        value={item.average}
                        max={metric.max}
                        size="md"
                        showValue={false}
                      />
                      <div className="text-2xl font-bold text-primary min-w-[3rem] text-right">
                        {item.average.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar showing relative rating */}
                  <motion.div
                    className="mt-3 h-2 bg-muted rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        '--bar-color': TILE_COLORS[index % TILE_COLORS.length],
                        backgroundColor: 'var(--bar-color)',
                      } as React.CSSProperties}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((item.average - metric.min) / (metric.max - metric.min)) * 100}%`
                      }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                    />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No ratings to compare yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
