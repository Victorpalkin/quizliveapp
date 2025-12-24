'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Award, BarChart3, Grid3X3, Flame } from 'lucide-react';
import { SlideHostProps } from '../types';
import { RatingDisplay } from '@/components/app/rating-input';
import { useRatingAggregates } from '@/firebase/presentation/use-slide-ratings';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

// CSS color strings for charts (not Tailwind classes)
const TILE_COLORS = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
];

interface RankedItem {
  slideId: string;
  title: string;
  description?: string;
  average: number;
  count: number;
  rank: number;
  distribution: number[]; // Rating counts for each value
}

/**
 * RatingSummaryHost shows a comprehensive summary of all ratings
 * with multiple visualization options (ranking list, bar chart, heatmap)
 */
export function RatingSummaryHost({ slide, presentation, game }: SlideHostProps) {
  const defaultView = slide.summaryDefaultView || 'ranking';
  const [activeTab, setActiveTab] = useState<string>(defaultView);
  const title = slide.summaryTitle || 'Rating Summary';

  // Get all rating-input slides in the presentation
  const ratingInputSlides = useMemo(
    () => presentation.slides.filter(s => s.type === 'rating-input'),
    [presentation.slides]
  );

  const slideIds = ratingInputSlides.map(s => s.id);

  // Fetch aggregated ratings for all slides
  const { aggregates, loading } = useRatingAggregates(game.id, slideIds);

  // Build ranked items list with distribution data
  const rankedItems: RankedItem[] = useMemo(() => {
    const items = ratingInputSlides.map(inputSlide => {
      // Find the describe slide for the title
      const describeSlide = presentation.slides.find(s => s.id === inputSlide.ratingInputSlideId);
      const itemTitle = describeSlide?.ratingItem?.title || 'Untitled';
      const itemDescription = describeSlide?.ratingItem?.description;

      const aggregate = aggregates.get(inputSlide.id);

      return {
        slideId: inputSlide.id,
        title: itemTitle,
        description: itemDescription,
        average: aggregate?.average || 0,
        count: aggregate?.count || 0,
        rank: 0,
        distribution: aggregate?.distribution || [],
      };
    });

    // Sort by average rating (descending) and assign ranks
    items.sort((a, b) => b.average - a.average);
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return items;
  }, [ratingInputSlides, presentation.slides, aggregates]);

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

  // Chart data for bar chart view
  const chartData = useMemo(() => {
    return rankedItems.map((item, index) => ({
      name: item.title.length > 15 ? item.title.slice(0, 13) + '...' : item.title,
      fullName: item.title,
      score: item.average,
      rank: item.rank,
      count: item.count,
      color: TILE_COLORS[index % TILE_COLORS.length],
    }));
  }, [rankedItems]);

  // Heatmap data - items x rating values
  const heatmapData = useMemo(() => {
    const maxRating = metric.max;
    const minRating = metric.min;
    const ratingRange = Array.from(
      { length: maxRating - minRating + 1 },
      (_, i) => minRating + i
    );

    return {
      ratingRange,
      items: rankedItems.map((item, idx) => ({
        ...item,
        colorIndex: idx,
        percentages: ratingRange.map((rating, i) => {
          const count = item.distribution[i] || 0;
          return item.count > 0 ? (count / item.count) * 100 : 0;
        }),
      })),
    };
  }, [rankedItems, metric]);

  const getHeatmapColor = (percentage: number) => {
    if (percentage === 0) return 'bg-muted';
    if (percentage < 20) return 'bg-primary/20';
    if (percentage < 40) return 'bg-primary/40';
    if (percentage < 60) return 'bg-primary/60';
    if (percentage < 80) return 'bg-primary/80';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-pulse text-muted-foreground">Loading ratings...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex flex-col p-8 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <motion.div
        className="text-center mb-6 flex-shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-xl text-muted-foreground">
          {rankedItems.length} items rated by {avgResponsesPerItem} participants
        </p>
      </motion.div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-4 flex-shrink-0">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Heatmap
          </TabsTrigger>
        </TabsList>

        {/* Ranking View */}
        <TabsContent value="ranking" className="flex-1 overflow-y-auto mt-0">
          <div className="w-full max-w-3xl mx-auto space-y-4">
            {rankedItems.length > 0 ? (
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
                        <div className="flex items-center justify-center w-10 h-10">
                          {getRankIcon(item.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.count} {item.count === 1 ? 'rating' : 'ratings'}
                          </p>
                        </div>
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
                      <motion.div
                        className="mt-3 h-2 bg-muted rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: TILE_COLORS[index % TILE_COLORS.length],
                          }}
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
                  <p>No ratings to display yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Chart View */}
        <TabsContent value="chart" className="flex-1 mt-0">
          <div className="w-full h-full max-w-4xl mx-auto">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, metric.max]}
                    tickFormatter={(value) => value.toFixed(1)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 13 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p className="font-medium text-sm">{data.fullName}</p>
                          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                            <p>Rank: #{data.rank}</p>
                            <p>Average: {data.score.toFixed(2)}</p>
                            <p>Ratings: {data.count}</p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="score"
                    radius={[0, 6, 6, 0]}
                    barSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="score"
                      position="right"
                      formatter={(value: number) => value.toFixed(1)}
                      style={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data to display
              </div>
            )}
          </div>
        </TabsContent>

        {/* Heatmap View */}
        <TabsContent value="heatmap" className="flex-1 overflow-auto mt-0">
          <div className="w-full max-w-4xl mx-auto">
            {heatmapData.items.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-background z-10 text-left p-3 font-medium text-muted-foreground border-b min-w-[160px]">
                      Item
                    </th>
                    {heatmapData.ratingRange.map((rating) => (
                      <th
                        key={rating}
                        className="text-center p-3 font-medium text-muted-foreground border-b min-w-[60px]"
                      >
                        {metric.type === 'stars' ? `${rating}★` : rating}
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium text-muted-foreground border-b min-w-[80px]">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.items.map((item) => (
                    <tr key={item.slideId} className="border-b border-border/50 last:border-b-0">
                      <td className="sticky left-0 bg-background z-10 p-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{item.rank}</span>
                          <span className="truncate max-w-[120px]" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                      </td>
                      {item.percentages.map((pct, idx) => (
                        <td key={idx} className="p-2 text-center">
                          <div
                            className={`w-full h-10 rounded flex items-center justify-center text-sm font-medium ${getHeatmapColor(pct)} ${pct > 40 ? 'text-white' : 'text-foreground'}`}
                            title={`${pct.toFixed(0)}%`}
                          >
                            {pct > 0 ? `${pct.toFixed(0)}%` : '—'}
                          </div>
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <div className="w-full h-10 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {item.average.toFixed(1)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No data to display
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
