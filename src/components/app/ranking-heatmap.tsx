'use client';

import { useMemo } from 'react';
import type { RankingItemResult, RankingMetric } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RankingHeatmapProps {
  items: RankingItemResult[];
  metrics: RankingMetric[];
  className?: string;
}

/**
 * Get color for a heatmap cell based on normalized score (0-1)
 * Higher scores = greener, lower scores = redder
 * For lowerIsBetter metrics, the normalization is already inverted in the data
 */
function getHeatmapColor(normalizedScore: number): string {
  // Score 0-1, where higher is better (already normalized for lowerIsBetter)
  // Use HSL: 0 = red, 60 = yellow, 120 = green
  const hue = normalizedScore * 120; // 0 (red) to 120 (green)
  const saturation = 70;
  const lightness = 45 + (1 - normalizedScore) * 15; // Darker for high scores
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function RankingHeatmap({ items, metrics, className }: RankingHeatmapProps) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.rank - b.rank);
  }, [items]);

  if (items.length === 0 || metrics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        No data to display
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('overflow-x-auto', className)}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-background z-10 text-left p-2 font-medium text-muted-foreground border-b min-w-[180px]">
                Item
              </th>
              {metrics.map((metric) => (
                <th
                  key={metric.id}
                  className="text-center p-2 font-medium text-muted-foreground border-b min-w-[100px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{metric.name}</span>
                    {metric.lowerIsBetter ? (
                      <ArrowDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
              <th className="text-center p-2 font-medium text-muted-foreground border-b min-w-[80px]">
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.itemId} className="border-b border-border/50 last:border-b-0">
                <td className="sticky left-0 bg-background z-10 p-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">#{item.rank}</span>
                    <span className="truncate max-w-[150px]" title={item.itemText}>
                      {item.itemText}
                    </span>
                  </div>
                </td>
                {metrics.map((metric) => {
                  const metricScore = item.metricScores[metric.id];
                  if (!metricScore || metricScore.responseCount === 0) {
                    return (
                      <td key={metric.id} className="p-2 text-center">
                        <div className="w-full h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-sm">
                          —
                        </div>
                      </td>
                    );
                  }

                  const displayValue = metricScore.rawAverage.toFixed(1);
                  const color = getHeatmapColor(metricScore.normalizedAverage);

                  return (
                    <td key={metric.id} className="p-2 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="w-full h-10 rounded flex items-center justify-center text-white font-semibold cursor-help"
                            style={{ backgroundColor: color }}
                          >
                            {displayValue}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">{metric.name}:</span> {displayValue}</p>
                            <p>Median: {metricScore.median.toFixed(1)}</p>
                            <p>Std Dev: {metricScore.stdDev.toFixed(2)}</p>
                            <p>Responses: {metricScore.responseCount}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
                <td className="p-2 text-center">
                  <div className="w-full h-10 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {Math.round(item.overallScore * 100)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
