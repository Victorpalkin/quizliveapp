'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RatingScaleType = 'stars' | 'numeric' | 'labels';

export interface RatingInputProps {
  /** Type of rating scale */
  type: RatingScaleType;
  /** Minimum value (default: 1) */
  min?: number;
  /** Maximum value (default: 5 for stars, 10 for numeric) */
  max?: number;
  /** Labels for 'labels' type */
  labels?: string[];
  /** Current selected value */
  value: number | null;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const sizeConfig = {
  sm: {
    star: 'h-6 w-6',
    numeric: 'w-10 h-10 text-base',
    label: 'px-3 py-2 text-sm',
    gap: 'gap-1',
  },
  md: {
    star: 'h-8 w-8',
    numeric: 'w-12 h-12 text-lg',
    label: 'px-4 py-3 text-base',
    gap: 'gap-2',
  },
  lg: {
    star: 'h-10 w-10',
    numeric: 'w-14 h-14 text-xl',
    label: 'px-5 py-4 text-lg',
    gap: 'gap-3',
  },
};

/**
 * Reusable rating input component supporting stars, numeric, and label scales.
 * Used by both Evaluation activities and Presentation rating slides.
 */
export function RatingInput({
  type,
  min = 1,
  max = type === 'stars' ? 5 : 10,
  labels,
  value,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: RatingInputProps) {
  const sizes = sizeConfig[size];

  // Star rating
  if (type === 'stars') {
    return (
      <div className={cn('flex', sizes.gap, className)}>
        {Array.from({ length: max - min + 1 }).map((_, i) => {
          const starValue = min + i;
          const isSelected = value !== null && value >= starValue;
          return (
            <button
              key={starValue}
              onClick={() => !disabled && onChange(starValue)}
              disabled={disabled}
              className={cn(
                'p-1 transition-transform hover:scale-110 active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
              )}
              aria-label={`Rate ${starValue} out of ${max}`}
            >
              <Star
                className={cn(
                  sizes.star,
                  isSelected
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                )}
              />
            </button>
          );
        })}
      </div>
    );
  }

  // Numeric rating
  if (type === 'numeric') {
    return (
      <div className={cn('flex flex-wrap', sizes.gap, className)}>
        {Array.from({ length: max - min + 1 }).map((_, i) => {
          const numValue = min + i;
          const isSelected = value === numValue;
          return (
            <button
              key={numValue}
              onClick={() => !disabled && onChange(numValue)}
              disabled={disabled}
              className={cn(
                sizes.numeric,
                'rounded-full border-2 font-medium transition-all active:scale-95',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 hover:border-primary',
                disabled && 'opacity-50 cursor-not-allowed hover:border-muted-foreground/30'
              )}
            >
              {numValue}
            </button>
          );
        })}
      </div>
    );
  }

  // Label rating
  if (type === 'labels' && labels && labels.length > 0) {
    return (
      <div className={cn('flex flex-wrap', sizes.gap, className)}>
        {labels.map((label, i) => {
          const labelValue = i + 1;
          const isSelected = value === labelValue;
          return (
            <button
              key={labelValue}
              onClick={() => !disabled && onChange(labelValue)}
              disabled={disabled}
              className={cn(
                sizes.label,
                'rounded-full border-2 font-medium transition-all active:scale-95',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 hover:border-primary',
                disabled && 'opacity-50 cursor-not-allowed hover:border-muted-foreground/30'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

/**
 * Display-only rating (for showing results)
 */
export interface RatingDisplayProps {
  /** Type of rating scale */
  type: RatingScaleType;
  /** Average or selected value */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show numeric value alongside stars */
  showValue?: boolean;
  /** Additional className */
  className?: string;
}

export function RatingDisplay({
  type,
  value,
  max = 5,
  size = 'md',
  showValue = true,
  className,
}: RatingDisplayProps) {
  const sizes = sizeConfig[size];

  if (type === 'stars') {
    const fullStars = Math.floor(value);
    const hasPartial = value % 1 >= 0.25;

    return (
      <div className={cn('flex items-center', sizes.gap, className)}>
        <div className="flex">
          {Array.from({ length: max }).map((_, i) => {
            const isFilled = i < fullStars || (i === fullStars && hasPartial);
            return (
              <Star
                key={i}
                className={cn(
                  sizes.star,
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                )}
              />
            );
          })}
        </div>
        {showValue && (
          <span className="font-semibold text-foreground ml-2">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  // For numeric/labels, just show the value
  return (
    <div className={cn('flex items-center', className)}>
      <span className="text-2xl font-bold text-primary">{value.toFixed(1)}</span>
      <span className="text-muted-foreground ml-1">/ {max}</span>
    </div>
  );
}
