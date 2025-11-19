'use client';

import { cn } from '@/lib/utils';

interface CircularTimerProps {
  time: number;
  timeLimit: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

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

  // Color gradient based on time remaining
  const getColor = () => {
    if (progress > 0.5) return 'hsl(var(--primary))'; // Purple - plenty of time
    if (progress > 0.25) return 'hsl(var(--accent))'; // Pink - halfway
    return 'hsl(25 95% 53%)'; // Orange - running out
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
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
          'font-semibold tabular-nums',
          size >= 80 ? 'text-2xl' : size >= 64 ? 'text-xl' : 'text-lg'
        )}>
          {time}
        </span>
      </div>
    </div>
  );
}
