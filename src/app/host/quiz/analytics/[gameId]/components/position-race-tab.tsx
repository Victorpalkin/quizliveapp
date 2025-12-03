'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GameAnalytics, PositionHistoryEntry } from '@/lib/types';

interface PositionRaceTabProps {
  analytics: GameAnalytics;
}

// Color palette for players (distinct, accessible colors)
const PLAYER_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#ca8a04', // yellow
  '#9333ea', // purple
  '#0891b2', // cyan
  '#ea580c', // orange
  '#be185d', // pink
  '#4f46e5', // indigo
  '#059669', // emerald
  '#7c3aed', // violet
  '#0d9488', // teal
  '#b91c1c', // red-dark
  '#15803d', // green-dark
  '#a16207', // amber
  '#6d28d9', // purple-dark
  '#0e7490', // cyan-dark
  '#c2410c', // orange-dark
  '#9d174d', // pink-dark
  '#4338ca', // indigo-dark
];

export function PositionRaceTab({ analytics }: PositionRaceTabProps) {
  const { positionHistory, totalQuestions } = analytics;

  if (positionHistory.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No position history data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Position Race</CardTitle>
          <CardDescription>
            Track how the top 20 players&apos; rankings changed throughout the game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PositionChart
            positionHistory={positionHistory}
            totalQuestions={totalQuestions}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {positionHistory.map((player, idx) => (
              <Badge
                key={player.playerId}
                variant="outline"
                className="flex items-center gap-2"
                style={{ borderColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}
                />
                <span>{player.playerName}</span>
                <span className="text-muted-foreground">
                  ({player.finalScore.toLocaleString()})
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PositionChart({
  positionHistory,
  totalQuestions,
}: {
  positionHistory: PositionHistoryEntry[];
  totalQuestions: number;
}) {
  const chartData = useMemo(() => {
    const width = 800;
    const height = 400;
    const padding = { top: 20, right: 40, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // X scale: questions
    const xStep = chartWidth / Math.max(totalQuestions - 1, 1);

    // Y scale: positions (inverted - 1 at top)
    const maxPosition = Math.max(...positionHistory.flatMap(p => p.positions), 1);
    const yScale = (pos: number) => padding.top + ((pos - 1) / (maxPosition - 1 || 1)) * chartHeight;

    // Generate paths for each player
    const paths = positionHistory.map((player, playerIdx) => {
      const points = player.positions.map((pos, qIdx) => {
        const x = padding.left + qIdx * xStep;
        const y = yScale(pos);
        return { x, y, pos };
      });

      // Create smooth path
      const pathData = points.reduce((acc, point, idx) => {
        if (idx === 0) {
          return `M ${point.x} ${point.y}`;
        }
        // Use line segments (could use bezier for smoother curves)
        return `${acc} L ${point.x} ${point.y}`;
      }, '');

      return {
        playerId: player.playerId,
        playerName: player.playerName,
        color: PLAYER_COLORS[playerIdx % PLAYER_COLORS.length],
        pathData,
        points,
        finalPosition: player.positions[player.positions.length - 1],
      };
    });

    // X axis labels
    const xLabels = Array.from({ length: totalQuestions }, (_, i) => ({
      x: padding.left + i * xStep,
      label: `Q${i + 1}`,
    }));

    // Y axis labels
    const yLabels = [];
    const yStep = Math.ceil(maxPosition / 5);
    for (let pos = 1; pos <= maxPosition; pos += yStep) {
      yLabels.push({
        y: yScale(pos),
        label: pos.toString(),
      });
    }

    return { width, height, padding, paths, xLabels, yLabels };
  }, [positionHistory, totalQuestions]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full min-w-[600px]"
        style={{ maxHeight: '450px' }}
      >
        {/* Grid lines */}
        <g className="text-muted-foreground/20">
          {chartData.xLabels.map((label, idx) => (
            <line
              key={`x-grid-${idx}`}
              x1={label.x}
              y1={chartData.padding.top}
              x2={label.x}
              y2={chartData.height - chartData.padding.bottom}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          ))}
          {chartData.yLabels.map((label, idx) => (
            <line
              key={`y-grid-${idx}`}
              x1={chartData.padding.left}
              y1={label.y}
              x2={chartData.width - chartData.padding.right}
              y2={label.y}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* Player paths */}
        {chartData.paths.map((path) => (
          <g key={path.playerId}>
            {/* Path line */}
            <path
              d={path.pathData}
              fill="none"
              stroke={path.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-opacity hover:opacity-100"
              style={{ opacity: 0.8 }}
            />
            {/* End point */}
            <circle
              cx={path.points[path.points.length - 1]?.x}
              cy={path.points[path.points.length - 1]?.y}
              r={4}
              fill={path.color}
            />
          </g>
        ))}

        {/* X axis labels */}
        <g className="text-xs fill-muted-foreground">
          {chartData.xLabels.map((label, idx) => (
            <text
              key={`x-label-${idx}`}
              x={label.x}
              y={chartData.height - chartData.padding.bottom + 20}
              textAnchor="middle"
            >
              {label.label}
            </text>
          ))}
        </g>

        {/* Y axis labels */}
        <g className="text-xs fill-muted-foreground">
          {chartData.yLabels.map((label, idx) => (
            <text
              key={`y-label-${idx}`}
              x={chartData.padding.left - 10}
              y={label.y + 4}
              textAnchor="end"
            >
              #{label.label}
            </text>
          ))}
        </g>

        {/* Y axis title */}
        <text
          x={15}
          y={chartData.height / 2}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
          transform={`rotate(-90, 15, ${chartData.height / 2})`}
        >
          Position
        </text>

        {/* X axis title */}
        <text
          x={chartData.width / 2}
          y={chartData.height - 5}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          Question
        </text>
      </svg>
    </div>
  );
}
