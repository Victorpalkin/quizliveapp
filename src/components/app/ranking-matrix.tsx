'use client';

import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Label,
} from 'recharts';
import type { RankingItemResult, RankingMetric } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label as FormLabel } from '@/components/ui/label';

interface RankingMatrixProps {
  items: RankingItemResult[];
  metrics: RankingMetric[];
  className?: string;
}

// Quadrant colors
const QUADRANT_COLORS = {
  topRight: '#22c55e',    // green - best quadrant
  topLeft: '#3b82f6',     // blue
  bottomRight: '#f59e0b', // amber
  bottomLeft: '#ef4444',  // red - worst quadrant
};

function getQuadrantColor(x: number, y: number, midX: number, midY: number): string {
  if (x >= midX && y >= midY) return QUADRANT_COLORS.topRight;
  if (x < midX && y >= midY) return QUADRANT_COLORS.topLeft;
  if (x >= midX && y < midY) return QUADRANT_COLORS.bottomRight;
  return QUADRANT_COLORS.bottomLeft;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      fullName: string;
      xValue: number;
      yValue: number;
      xMetricName: string;
      yMetricName: string;
      rank: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm">{data.fullName}</p>
      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
        <p>Rank: #{data.rank}</p>
        <p>{data.xMetricName}: {data.xValue.toFixed(1)}</p>
        <p>{data.yMetricName}: {data.yValue.toFixed(1)}</p>
      </div>
    </div>
  );
}

export function RankingMatrix({ items, metrics, className }: RankingMatrixProps) {
  // Default to first two metrics if available
  const [xMetricId, setXMetricId] = useState<string>(metrics[0]?.id || '');
  const [yMetricId, setYMetricId] = useState<string>(metrics[1]?.id || metrics[0]?.id || '');

  const xMetric = metrics.find(m => m.id === xMetricId);
  const yMetric = metrics.find(m => m.id === yMetricId);

  const chartData = useMemo(() => {
    if (!xMetric || !yMetric) return [];

    return items
      .filter(item => {
        const xScore = item.metricScores[xMetricId];
        const yScore = item.metricScores[yMetricId];
        return xScore?.responseCount > 0 && yScore?.responseCount > 0;
      })
      .map(item => {
        const xScore = item.metricScores[xMetricId];
        const yScore = item.metricScores[yMetricId];

        return {
          name: item.itemText.length > 15
            ? item.itemText.slice(0, 13) + '...'
            : item.itemText,
          fullName: item.itemText,
          // Use raw average for display, but position based on normalized (accounts for lowerIsBetter)
          x: xScore.normalizedAverage * 100,
          y: yScore.normalizedAverage * 100,
          xValue: xScore.rawAverage,
          yValue: yScore.rawAverage,
          xMetricName: xMetric.name,
          yMetricName: yMetric.name,
          rank: item.rank,
          itemId: item.itemId,
        };
      });
  }, [items, xMetricId, yMetricId, xMetric, yMetric]);

  if (metrics.length < 2) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground', className)}>
        At least 2 metrics are required for the matrix view
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground', className)}>
        No items to display
      </div>
    );
  }

  // Calculate midpoints for quadrant lines (50% of normalized range)
  const midX = 50;
  const midY = 50;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Axis Selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <FormLabel className="text-sm text-muted-foreground whitespace-nowrap">X-Axis:</FormLabel>
          <Select value={xMetricId} onValueChange={setXMetricId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map(metric => (
                <SelectItem key={metric.id} value={metric.id}>
                  <div className="flex items-center gap-1">
                    {metric.name}
                    {metric.lowerIsBetter ? (
                      <ArrowDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <FormLabel className="text-sm text-muted-foreground whitespace-nowrap">Y-Axis:</FormLabel>
          <Select value={yMetricId} onValueChange={setYMetricId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map(metric => (
                <SelectItem key={metric.id} value={metric.id}>
                  <div className="flex items-center gap-1">
                    {metric.name}
                    {metric.lowerIsBetter ? (
                      <ArrowDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quadrant Labels */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
          High {yMetric?.name} / Low {xMetric?.name}
        </div>
        <div className="p-1.5 rounded bg-green-500/10 text-green-600 border border-green-500/20">
          High {yMetric?.name} / High {xMetric?.name} ★
        </div>
        <div className="p-1.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">
          Low {yMetric?.name} / Low {xMetric?.name}
        </div>
        <div className="p-1.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Low {yMetric?.name} / High {xMetric?.name}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            >
              <Label
                value={xMetric?.name || 'X'}
                position="bottom"
                offset={20}
                style={{ fill: '#6b7280', fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            >
              <Label
                value={yMetric?.name || 'Y'}
                angle={-90}
                position="left"
                offset={20}
                style={{ fill: '#6b7280', fontSize: 12 }}
              />
            </YAxis>

            {/* Quadrant divider lines */}
            <ReferenceLine
              x={midX}
              stroke="#d1d5db"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={midY}
              stroke="#d1d5db"
              strokeDasharray="4 4"
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              data={chartData}
              fill="#8884d8"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getQuadrantColor(entry.x, entry.y, midX, midY)}
                  stroke="#fff"
                  strokeWidth={2}
                  r={8}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground text-center">
        <p>Items are positioned by their normalized scores. Higher values = better (adjusted for &quot;lower is better&quot; metrics).</p>
        <p className="mt-1">The top-right quadrant (★) contains items that score well on both metrics.</p>
      </div>
    </div>
  );
}
