'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Target } from 'lucide-react';
import type { PresentationAnalytics, PresentationSlideType } from '@/lib/types';

interface EngagementTabProps {
  analytics: PresentationAnalytics;
}

// Interactive slide types
const INTERACTIVE_SLIDE_TYPES: PresentationSlideType[] = [
  'quiz',
  'poll',
  'thoughts-collect',
  'rating-input',
];

export function EngagementTab({ analytics }: EngagementTabProps) {
  const { playerEngagement, slideStats, totalPlayers, interactiveSlides } = analytics;

  // Get interactive slides for the timeline
  const interactiveSlideStats = slideStats.filter(s =>
    INTERACTIVE_SLIDE_TYPES.includes(s.slideType)
  );

  // Calculate engagement score distribution
  const engagementDistribution = useMemo(() => {
    const bins = [
      { label: '0-20%', min: 0, max: 20, count: 0 },
      { label: '21-40%', min: 21, max: 40, count: 0 },
      { label: '41-60%', min: 41, max: 60, count: 0 },
      { label: '61-80%', min: 61, max: 80, count: 0 },
      { label: '81-100%', min: 81, max: 100, count: 0 },
    ];

    playerEngagement.forEach(player => {
      const bin = bins.find(b =>
        player.engagementScore >= b.min && player.engagementScore <= b.max
      );
      if (bin) bin.count++;
    });

    return bins;
  }, [playerEngagement]);

  // Top and bottom engaged players
  const topEngaged = playerEngagement.slice(0, 5);
  const bottomEngaged = [...playerEngagement].reverse().slice(0, 5).reverse();

  return (
    <div className="space-y-6">
      {/* Engagement Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Score Distribution</CardTitle>
          <CardDescription>
            How players are distributed across engagement levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngagementHistogram
            bins={engagementDistribution}
            totalPlayers={totalPlayers}
          />
        </CardContent>
      </Card>

      {/* Participation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate by Slide</CardTitle>
          <CardDescription>
            How participation varied across interactive slides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipationTimeline slides={interactiveSlideStats} />
        </CardContent>
      </Card>

      {/* Top and Bottom Engaged Players */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Most Engaged Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEngaged.map((player, idx) => (
                <div key={player.playerId} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-4">{idx + 1}.</span>
                  <span className="flex-1 font-medium truncate">{player.playerName}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={player.engagementScore} className="w-20 h-2" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {player.engagementScore.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Least Engaged Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomEngaged.map((player, idx) => (
                <div key={player.playerId} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-4">
                    {totalPlayers - 4 + idx}.
                  </span>
                  <span className="flex-1 font-medium truncate">{player.playerName}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={player.engagementScore} className="w-20 h-2" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {player.engagementScore.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
          <CardDescription>Key participation statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              icon={<Users className="h-5 w-5 text-pink-500" />}
              label="Total Players"
              value={totalPlayers}
            />
            <StatBox
              icon={<Target className="h-5 w-5 text-green-500" />}
              label="Interactive Slides"
              value={interactiveSlides}
            />
            <StatBox
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              label="Fully Engaged"
              value={playerEngagement.filter(p => p.engagementScore >= 80).length}
            />
            <StatBox
              icon={<TrendingDown className="h-5 w-5 text-orange-500" />}
              label="Low Engagement"
              value={playerEngagement.filter(p => p.engagementScore < 40).length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EngagementHistogram({
  bins,
  totalPlayers,
}: {
  bins: { label: string; count: number }[];
  totalPlayers: number;
}) {
  const maxCount = Math.max(...bins.map(b => b.count), 1);

  // Color gradient from red to green
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
  ];

  return (
    <div className="space-y-4">
      {bins.map((bin, idx) => {
        const percentage = totalPlayers > 0 ? (bin.count / totalPlayers) * 100 : 0;
        const barWidth = (bin.count / maxCount) * 100;

        return (
          <div key={bin.label} className="flex items-center gap-3 text-sm">
            <span className="w-20 text-right text-muted-foreground">
              {bin.label}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${colors[idx]} transition-all`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="w-16 text-muted-foreground">
              {bin.count} ({percentage.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ParticipationTimeline({
  slides,
}: {
  slides: { slideIndex: number; slideType: PresentationSlideType; responseRate: number; title?: string }[];
}) {
  if (slides.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No interactive slides in this presentation
      </p>
    );
  }

  const chartData = useMemo(() => {
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // X scale: slides
    const xStep = slides.length > 1 ? chartWidth / (slides.length - 1) : chartWidth / 2;

    // Y scale: 0-100%
    const yScale = (rate: number) => padding.top + ((100 - rate) / 100) * chartHeight;

    // Generate points
    const points = slides.map((slide, idx) => ({
      x: padding.left + idx * xStep,
      y: yScale(slide.responseRate),
      rate: slide.responseRate,
      label: slide.title?.slice(0, 15) || `S${slide.slideIndex + 1}`,
    }));

    // Generate path
    const pathData = points.reduce((acc, point, idx) => {
      if (idx === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    // Generate area path (fill below line)
    const areaPath = points.length > 0
      ? `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

    // X axis labels
    const xLabels = slides.map((slide, idx) => ({
      x: padding.left + idx * xStep,
      label: `S${slide.slideIndex + 1}`,
    }));

    // Y axis labels
    const yLabels = [0, 25, 50, 75, 100].map(rate => ({
      y: yScale(rate),
      label: `${rate}%`,
    }));

    return { width, height, padding, points, pathData, areaPath, xLabels, yLabels, chartHeight };
  }, [slides]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: '250px' }}
      >
        {/* Grid lines */}
        <g className="text-muted-foreground/20">
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

        {/* Area fill */}
        <path
          d={chartData.areaPath}
          fill="url(#engagementGradient)"
          opacity={0.3}
        />

        {/* Line */}
        <path
          d={chartData.pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {chartData.points.map((point, idx) => (
          <g key={idx}>
            <circle
              cx={point.x}
              cy={point.y}
              r={5}
              fill="hsl(var(--primary))"
              className="cursor-pointer"
            />
            <title>{point.label}: {point.rate.toFixed(1)}%</title>
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
              {label.label}
            </text>
          ))}
        </g>

        {/* Gradient definition */}
        <defs>
          <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
