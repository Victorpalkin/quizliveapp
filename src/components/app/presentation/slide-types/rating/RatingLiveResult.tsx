'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SlideHostProps } from '../types';
import { RatingDisplay } from '@/components/app/rating-input';
import { useSlideRatings } from '@/firebase/presentation/use-slide-ratings';

export function RatingLiveResult({ slide, presentation, game, playerCount }: SlideHostProps) {
  const sourceSlideId = slide.sourceSlideId || '';

  // Find linked describe slide for item title
  const sourceSlide = presentation.slides.find(s => s.id === sourceSlideId);
  const describeSlide = presentation.slides.find(s => s.id === sourceSlide?.ratingInputSlideId);
  const itemTitle = describeSlide?.ratingItem?.title || 'Item';
  const metric = sourceSlide?.ratingMetric || { type: 'stars' as const, min: 1, max: 5 };

  // Fetch ratings for this slide (real-time)
  const { ratings, loading } = useSlideRatings(game.id, sourceSlideId);

  // Track previous values for trend animation
  const prevCountRef = useRef(0);
  const prevAverageRef = useRef(0);
  const [showNewRating, setShowNewRating] = useState(false);
  const [trend, setTrend] = useState<'up' | 'down' | 'same'>('same');

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

  // Detect new ratings and calculate trend
  useEffect(() => {
    if (totalResponses > prevCountRef.current) {
      setShowNewRating(true);
      setTimeout(() => setShowNewRating(false), 1000);

      // Calculate trend
      if (prevCountRef.current > 0) {
        if (averageRating > prevAverageRef.current + 0.1) {
          setTrend('up');
        } else if (averageRating < prevAverageRef.current - 0.1) {
          setTrend('down');
        } else {
          setTrend('same');
        }
      }
    }

    prevCountRef.current = totalResponses;
    prevAverageRef.current = averageRating;
  }, [totalResponses, averageRating]);

  // Calculate participation percentage
  const participationPercent = playerCount > 0
    ? Math.round((totalResponses / playerCount) * 100)
    : 0;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header with live indicator */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <motion.div
            className="w-3 h-3 rounded-full bg-red-500"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-sm font-medium text-red-500 uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">{itemTitle}</h1>
      </motion.div>

      {/* Main content - two columns on larger screens */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Average rating with animation */}
        <Card className="bg-card/95 backdrop-blur">
          <CardContent className="p-8 text-center relative overflow-hidden">
            {/* New rating pulse effect */}
            <AnimatePresence>
              {showNewRating && (
                <motion.div
                  className="absolute inset-0 bg-primary/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            {loading ? (
              <div className="animate-pulse">
                <div className="h-20 w-32 bg-muted rounded mx-auto mb-4" />
                <div className="h-8 w-48 bg-muted rounded mx-auto" />
              </div>
            ) : totalResponses > 0 ? (
              <>
                {/* Large animated average rating */}
                <motion.div
                  className="text-8xl font-bold text-primary mb-2"
                  key={averageRating.toFixed(1)}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  {averageRating.toFixed(1)}
                </motion.div>

                {/* Trend indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {getTrendIcon()}
                  <span className="text-sm text-muted-foreground">
                    {trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}
                  </span>
                </div>

                {/* Rating display */}
                <div className="flex justify-center">
                  <RatingDisplay
                    type={metric.type}
                    value={averageRating}
                    max={metric.max}
                    size="lg"
                    showValue={false}
                  />
                </div>
              </>
            ) : (
              <div className="text-muted-foreground py-8">
                <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg">Waiting for ratings...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Participation and distribution */}
        <div className="space-y-4">
          {/* Participation card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Participation</span>
                </div>
                <motion.span
                  className="text-2xl font-bold"
                  key={totalResponses}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {totalResponses}/{playerCount}
                </motion.span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${participationPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1 text-right">
                {participationPercent}% responded
              </p>
            </CardContent>
          </Card>

          {/* Live distribution */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Distribution</h3>
              <div className="space-y-2">
                {Array.from({ length: metric.max - metric.min + 1 }).map((_, i) => {
                  const ratingValue = metric.max - i;
                  const count = distribution[ratingValue] || 0;
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={ratingValue} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-10">
                        <span className="text-sm font-medium">{ratingValue}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <motion.span
                        className="text-sm text-muted-foreground w-8 text-right"
                        key={count}
                        initial={{ scale: count > 0 ? 1.2 : 1 }}
                        animate={{ scale: 1 }}
                      >
                        {count}
                      </motion.span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
