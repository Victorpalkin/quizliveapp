'use client';

import { useMemo } from 'react';
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
import type { RankingItemResult } from '@/lib/types';

interface RankingBarChartProps {
  items: RankingItemResult[];
  className?: string;
}

// Generate colors based on rank position
function getRankColor(rank: number, total: number): string {
  if (rank === 1) return '#22c55e'; // green-500
  if (rank === 2) return '#3b82f6'; // blue-500
  if (rank === 3) return '#8b5cf6'; // violet-500

  // Gradient from violet to gray for remaining items
  const progress = (rank - 3) / Math.max(total - 3, 1);
  const r = Math.round(139 + (156 - 139) * progress);
  const g = Math.round(92 + (163 - 92) * progress);
  const b = Math.round(246 + (175 - 246) * progress);
  return `rgb(${r}, ${g}, ${b})`;
}

export function RankingBarChart({ items, className }: RankingBarChartProps) {
  const chartData = useMemo(() => {
    return items
      .sort((a, b) => a.rank - b.rank)
      .map(item => ({
        name: item.itemText.length > 20
          ? item.itemText.slice(0, 18) + '...'
          : item.itemText,
        fullName: item.itemText,
        score: Math.round(item.overallScore * 100),
        rank: item.rank,
        consensus: item.consensusLevel,
      }));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        No items to display
      </div>
    );
  }

  const barHeight = 44;
  const minHeight = 200;
  const chartHeight = Math.max(minHeight, chartData.length * barHeight + 60);

  return (
    <div className={className} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
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
                    <p>Score: {data.score}%</p>
                    <p className="capitalize">Consensus: {data.consensus}</p>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="score"
            radius={[0, 6, 6, 0]}
            barSize={28}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getRankColor(entry.rank, chartData.length)}
              />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              formatter={(value: number) => `${value}%`}
              style={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
