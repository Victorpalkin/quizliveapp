'use client';

import { cn } from '@/lib/utils';

interface CircularTimerProps {
  time: number;
  timeLimit: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

type UrgencyLevel = 'normal' | 'warning' | 'danger' | 'critical';

export function CircularTimer({
  time,
  timeLimit,
  size = 64,
  strokeWidth = 4,
  className,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = time / timeLimit;
  const offset = circumference - progress * circumference;

  // Determine urgency level based on time remaining
  const getUrgencyLevel = (): UrgencyLevel => {
    if (time <= 3) return 'critical';  // Last 3 seconds
    if (progress <= 0.15) return 'danger';  // Last 15%
    if (progress <= 0.35) return 'warning'; // 15-35%
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  // Color based on urgency
  const getColor = () => {
    switch (urgency) {
      case 'critical': return 'hsl(0 84% 60%)';    // Red
      case 'danger': return 'hsl(25 95% 53%)';     // Orange
      case 'warning': return 'hsl(var(--accent))'; // Pink
      default: return 'hsl(var(--primary))';       // Purple
    }
  };

  // Text color based on urgency
  const getTextColorClass = () => {
    switch (urgency) {
      case 'critical': return 'text-red-500';
      case 'danger': return 'text-orange-500';
      case 'warning': return 'text-pink-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className={cn(
      'relative inline-flex items-center justify-center',
      urgency === 'critical' && 'animate-pulse',
      className
    )}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>

      {/* Countdown number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'font-bold tabular-nums transition-colors duration-300',
          size >= 80 ? 'text-2xl' : size >= 64 ? 'text-xl' : 'text-lg',
          getTextColorClass()
        )}>
          {time}
        </span>
      </div>
    </div>
  );
}
