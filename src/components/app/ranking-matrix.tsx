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
  ReferenceArea,
  Customized,
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

// Quadrant colors - will be assigned dynamically based on metric directions
const QUADRANT_COLORS = {
  best: '#22c55e',      // green - best quadrant
  good: '#3b82f6',      // blue - good on one metric
  mixed: '#f59e0b',     // amber - good on other metric
  worst: '#ef4444',     // red - worst quadrant
};

// Determine which quadrant is "best" based on metric lowerIsBetter flags
// Returns colors for: topLeft, topRight, bottomLeft, bottomRight
function getQuadrantColorMap(xLowerIsBetter: boolean, yLowerIsBetter: boolean) {
  // Best X: high if !lowerIsBetter, low if lowerIsBetter (right vs left)
  // Best Y: high if !lowerIsBetter, low if lowerIsBetter (top vs bottom)
  const bestX = xLowerIsBetter ? 'left' : 'right';
  const bestY = yLowerIsBetter ? 'bottom' : 'top';

  // Determine quadrant colors based on which is best
  const colors = {
    topLeft: QUADRANT_COLORS.mixed,
    topRight: QUADRANT_COLORS.mixed,
    bottomLeft: QUADRANT_COLORS.mixed,
    bottomRight: QUADRANT_COLORS.mixed,
  };

  // Best quadrant (good on both)
  const bestQuadrant = `${bestY}${bestX.charAt(0).toUpperCase() + bestX.slice(1)}` as keyof typeof colors;
  colors[bestQuadrant] = QUADRANT_COLORS.best;

  // Worst quadrant (bad on both) - opposite of best
  const worstY = bestY === 'top' ? 'bottom' : 'top';
  const worstX = bestX === 'left' ? 'Right' : 'Left';
  const worstQuadrant = `${worstY}${worstX}` as keyof typeof colors;
  colors[worstQuadrant] = QUADRANT_COLORS.worst;

  // The other two quadrants are "good" (good on one metric)
  for (const key of Object.keys(colors) as (keyof typeof colors)[]) {
    if (colors[key] === QUADRANT_COLORS.mixed) {
      colors[key] = QUADRANT_COLORS.good;
    }
  }

  return colors;
}

function getQuadrantColor(
  x: number,
  y: number,
  midX: number,
  midY: number,
  colorMap: ReturnType<typeof getQuadrantColorMap>,
  xReversed: boolean,
  yReversed: boolean
): string {
  // When axis is reversed, the "high" side is visually flipped
  // For reversed X: left side is high values, right side is low values
  // For reversed Y: bottom side is high values, top side is low values
  const isRightSide = xReversed ? x < midX : x >= midX;
  const isTopSide = yReversed ? y < midY : y >= midY;

  if (isRightSide && isTopSide) return colorMap.topRight;
  if (!isRightSide && isTopSide) return colorMap.topLeft;
  if (isRightSide && !isTopSide) return colorMap.bottomRight;
  return colorMap.bottomLeft;
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
          // Use raw average for positioning (absolute values)
          x: xScore.rawAverage,
          y: yScore.rawAverage,
          xValue: xScore.rawAverage,
          yValue: yScore.rawAverage,
          xMetricName: xMetric.name,
          yMetricName: yMetric.name,
          rank: item.rank,
          itemId: item.itemId,
        };
      });
  }, [items, xMetricId, yMetricId, xMetric, yMetric]);

  // Calculate axis domains based on metric scales
  const xDomain: [number, number] = useMemo(() => {
    if (!xMetric) return [0, 100];
    // For lowerIsBetter, reverse the axis (max to min) so lower values are on the right (good side)
    return xMetric.lowerIsBetter
      ? [xMetric.scaleMax, xMetric.scaleMin]
      : [xMetric.scaleMin, xMetric.scaleMax];
  }, [xMetric]);

  const yDomain: [number, number] = useMemo(() => {
    if (!yMetric) return [0, 100];
    // For lowerIsBetter, reverse the axis (max to min) so lower values are on the top (good side)
    return yMetric.lowerIsBetter
      ? [yMetric.scaleMax, yMetric.scaleMin]
      : [yMetric.scaleMin, yMetric.scaleMax];
  }, [yMetric]);

  // Calculate midpoint for quadrant lines (middle of the scale)
  const midX = useMemo(() => {
    if (!xMetric) return 50;
    return (xMetric.scaleMin + xMetric.scaleMax) / 2;
  }, [xMetric]);

  const midY = useMemo(() => {
    if (!yMetric) return 50;
    return (yMetric.scaleMin + yMetric.scaleMax) / 2;
  }, [yMetric]);

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

  // Get quadrant color map based on metric directions
  const quadrantColorMap = useMemo(() =>
    getQuadrantColorMap(xMetric?.lowerIsBetter || false, yMetric?.lowerIsBetter || false),
    [xMetric?.lowerIsBetter, yMetric?.lowerIsBetter]
  );

  // Generate quadrant labels based on metric directions
  const quadrantLabels = useMemo(() => {
    const xBest = xMetric?.lowerIsBetter ? 'Low' : 'High';
    const xWorst = xMetric?.lowerIsBetter ? 'High' : 'Low';
    const yBest = yMetric?.lowerIsBetter ? 'Low' : 'High';
    const yWorst = yMetric?.lowerIsBetter ? 'High' : 'Low';

    return {
      topLeft: {
        x: xWorst,
        y: yBest,
        isBest: xMetric?.lowerIsBetter && !yMetric?.lowerIsBetter ? false :
                !xMetric?.lowerIsBetter && yMetric?.lowerIsBetter ? false :
                xMetric?.lowerIsBetter && yMetric?.lowerIsBetter ? false : false,
        color: quadrantColorMap.topLeft,
      },
      topRight: {
        x: xBest,
        y: yBest,
        isBest: !xMetric?.lowerIsBetter && !yMetric?.lowerIsBetter,
        color: quadrantColorMap.topRight,
      },
      bottomLeft: {
        x: xWorst,
        y: yWorst,
        isBest: xMetric?.lowerIsBetter && yMetric?.lowerIsBetter,
        color: quadrantColorMap.bottomLeft,
      },
      bottomRight: {
        x: xBest,
        y: yWorst,
        isBest: false,
        color: quadrantColorMap.bottomRight,
      },
    };
  }, [xMetric?.lowerIsBetter, yMetric?.lowerIsBetter, quadrantColorMap]);

  // Determine which quadrant is best
  const bestQuadrantKey = useMemo(() => {
    if (!xMetric?.lowerIsBetter && !yMetric?.lowerIsBetter) return 'topRight';
    if (xMetric?.lowerIsBetter && !yMetric?.lowerIsBetter) return 'topLeft';
    if (!xMetric?.lowerIsBetter && yMetric?.lowerIsBetter) return 'bottomRight';
    return 'bottomLeft';
  }, [xMetric?.lowerIsBetter, yMetric?.lowerIsBetter]);

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
        <div
          className="p-1.5 rounded border"
          style={{
            backgroundColor: `${quadrantColorMap.topLeft}10`,
            borderColor: `${quadrantColorMap.topLeft}30`,
            color: quadrantColorMap.topLeft,
          }}
        >
          {bestQuadrantKey === 'topLeft' && '★ '}Best {yMetric?.name} / Best {xMetric?.name}
          {bestQuadrantKey !== 'topLeft' && `Best ${yMetric?.name} / Worst ${xMetric?.name}`}
        </div>
        <div
          className="p-1.5 rounded border"
          style={{
            backgroundColor: `${quadrantColorMap.topRight}10`,
            borderColor: `${quadrantColorMap.topRight}30`,
            color: quadrantColorMap.topRight,
          }}
        >
          {bestQuadrantKey === 'topRight' && '★ '}Best {yMetric?.name} / Best {xMetric?.name}
          {bestQuadrantKey !== 'topRight' && `Best ${yMetric?.name} / Worst ${xMetric?.name}`}
        </div>
        <div
          className="p-1.5 rounded border"
          style={{
            backgroundColor: `${quadrantColorMap.bottomLeft}10`,
            borderColor: `${quadrantColorMap.bottomLeft}30`,
            color: quadrantColorMap.bottomLeft,
          }}
        >
          {bestQuadrantKey === 'bottomLeft' && '★ '}Best {yMetric?.name} / Best {xMetric?.name}
          {bestQuadrantKey !== 'bottomLeft' && `Worst ${yMetric?.name} / Worst ${xMetric?.name}`}
        </div>
        <div
          className="p-1.5 rounded border"
          style={{
            backgroundColor: `${quadrantColorMap.bottomRight}10`,
            borderColor: `${quadrantColorMap.bottomRight}30`,
            color: quadrantColorMap.bottomRight,
          }}
        >
          {bestQuadrantKey === 'bottomRight' && '★ '}Best {yMetric?.name} / Best {xMetric?.name}
          {bestQuadrantKey !== 'bottomRight' && `Worst ${yMetric?.name} / Best ${xMetric?.name}`}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 30, right: 20, bottom: 40, left: 40 }}>
            {/* Quadrant background colors - use scale min/max for boundaries */}
            <ReferenceArea
              x1={xMetric?.scaleMin || 0}
              x2={midX}
              y1={midY}
              y2={yMetric?.scaleMax || 100}
              fill={quadrantColorMap.topLeft}
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={midX}
              x2={xMetric?.scaleMax || 100}
              y1={midY}
              y2={yMetric?.scaleMax || 100}
              fill={quadrantColorMap.topRight}
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMetric?.scaleMin || 0}
              x2={midX}
              y1={yMetric?.scaleMin || 0}
              y2={midY}
              fill={quadrantColorMap.bottomLeft}
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={midX}
              x2={xMetric?.scaleMax || 100}
              y1={yMetric?.scaleMin || 0}
              y2={midY}
              fill={quadrantColorMap.bottomRight}
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              tickFormatter={(value) => value.toFixed(1)}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              reversed={xMetric?.lowerIsBetter}
            >
              <Label
                value={`${xMetric?.name || 'X'}${xMetric?.lowerIsBetter ? ' (lower is better →)' : ''}`}
                position="bottom"
                offset={20}
                style={{ fill: '#6b7280', fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              tickFormatter={(value) => value.toFixed(1)}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              reversed={yMetric?.lowerIsBetter}
            >
              <Label
                value={`${yMetric?.name || 'Y'}${yMetric?.lowerIsBetter ? ' (lower is better ↑)' : ''}`}
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
                  fill={getQuadrantColor(
                    entry.x,
                    entry.y,
                    midX,
                    midY,
                    quadrantColorMap,
                    xMetric?.lowerIsBetter || false,
                    yMetric?.lowerIsBetter || false
                  )}
                  stroke="#fff"
                  strokeWidth={2}
                  r={12}
                />
              ))}
            </Scatter>

            {/* Custom labels layer */}
            <Customized
              component={(props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }> }) => {
                const { xAxisMap, yAxisMap } = props;
                if (!xAxisMap || !yAxisMap) return null;
                const xAxis = Object.values(xAxisMap)[0];
                const yAxis = Object.values(yAxisMap)[0];
                if (!xAxis?.scale || !yAxis?.scale) return null;

                return (
                  <g>
                    {chartData.map((entry, index) => {
                      const cx = xAxis.scale(entry.x);
                      const cy = yAxis.scale(entry.y);
                      const labelWidth = Math.min(entry.name.length * 7 + 12, 100);

                      return (
                        <g key={`label-${index}`}>
                          <rect
                            x={cx - labelWidth / 2}
                            y={cy - 32}
                            width={labelWidth}
                            height={18}
                            fill="white"
                            fillOpacity={0.9}
                            rx={4}
                            stroke="#e5e7eb"
                            strokeWidth={1}
                          />
                          <text
                            x={cx}
                            y={cy - 20}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={500}
                            fill="#374151"
                          >
                            {entry.name}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground text-center">
        <p>Items are positioned by their average ratings. Axes are oriented so &quot;better&quot; values are toward the ★ quadrant.</p>
      </div>
    </div>
  );
}
