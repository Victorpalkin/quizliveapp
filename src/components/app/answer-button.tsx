'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface AnswerButtonProps {
  letter: string;
  text: string;
  selected?: boolean;
  disabled?: boolean;
  showCheck?: boolean;
  onClick?: () => void;
  className?: string;
  colorIndex?: number;
  // Live results display (host view)
  showLiveCount?: boolean;
  count?: number;
  totalCount?: number;
}

// 8 subtle color gradients for answer options
const colorGradients = [
  {
    bg: 'from-purple-500/15 to-purple-500/8',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'from-purple-500 to-purple-600',
    selectedBg: 'from-purple-500/20 to-transparent',
    selectedBorder: 'before:from-purple-500 before:to-purple-600',
  },
  {
    bg: 'from-blue-500/15 to-blue-500/8',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'from-blue-500 to-blue-600',
    selectedBg: 'from-blue-500/20 to-transparent',
    selectedBorder: 'before:from-blue-500 before:to-blue-600',
  },
  {
    bg: 'from-green-500/15 to-green-500/8',
    border: 'border-green-200 dark:border-green-900',
    badge: 'from-green-500 to-green-600',
    selectedBg: 'from-green-500/20 to-transparent',
    selectedBorder: 'before:from-green-500 before:to-green-600',
  },
  {
    bg: 'from-amber-500/15 to-amber-500/8',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'from-amber-500 to-amber-600',
    selectedBg: 'from-amber-500/20 to-transparent',
    selectedBorder: 'before:from-amber-500 before:to-amber-600',
  },
  {
    bg: 'from-rose-500/15 to-rose-500/8',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'from-rose-500 to-rose-600',
    selectedBg: 'from-rose-500/20 to-transparent',
    selectedBorder: 'before:from-rose-500 before:to-rose-600',
  },
  {
    bg: 'from-cyan-500/15 to-cyan-500/8',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'from-cyan-500 to-cyan-600',
    selectedBg: 'from-cyan-500/20 to-transparent',
    selectedBorder: 'before:from-cyan-500 before:to-cyan-600',
  },
  {
    bg: 'from-indigo-500/15 to-indigo-500/8',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'from-indigo-500 to-indigo-600',
    selectedBg: 'from-indigo-500/20 to-transparent',
    selectedBorder: 'before:from-indigo-500 before:to-indigo-600',
  },
  {
    bg: 'from-pink-500/15 to-pink-500/8',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'from-pink-500 to-pink-600',
    selectedBg: 'from-pink-500/20 to-transparent',
    selectedBorder: 'before:from-pink-500 before:to-pink-600',
  },
];

export function AnswerButton({
  letter,
  text,
  selected = false,
  disabled = false,
  showCheck = false,
  onClick,
  className,
  colorIndex = 0,
  showLiveCount = false,
  count = 0,
  totalCount = 0,
}: AnswerButtonProps) {
  const colors = colorGradients[colorIndex % colorGradients.length];

  // Calculate percentage for progress bar
  const percentage = showLiveCount && totalCount > 0 ? (count / totalCount) * 100 : 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'w-full p-6 rounded-xl text-left',
        'shadow-md transition-all duration-300',

        // Color gradient background and border
        `bg-gradient-to-r ${colors.bg}`,
        colors.border,
        'border',

        // Relative positioning for progress bar overlay
        showLiveCount && 'relative overflow-hidden',

        // Interactive states
        !disabled && 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
        disabled && !selected && !showLiveCount && 'opacity-50 cursor-not-allowed',

        // Selected state - gradient left border with pop animation
        selected && [
          'border-l-4',
          `bg-gradient-to-r ${colors.selectedBg}`,
          'shadow-xl',
          'animate-[confirmPop_0.3s_ease-out]',
          // Add gradient border using pseudo-element
          'relative',
          'before:absolute before:left-0 before:top-0 before:h-full before:w-1',
          `before:bg-gradient-to-b ${colors.selectedBorder}`,
          'before:rounded-l-xl',
        ],

        className
      )}
      style={selected ? {
        animation: 'confirmPop 0.3s ease-out',
      } : undefined}
    >
      {/* Live Results Progress Bar - absolute positioned background */}
      {showLiveCount && (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              `bg-gradient-to-r ${colors.badge}`,
              'opacity-20'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-4 relative z-10">
        {/* Letter Badge - shows checkmark when selected for single-choice */}
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
          'text-xl font-semibold transition-all duration-300',
          selected
            ? `bg-gradient-to-br ${colors.badge} text-white scale-110`
            : 'bg-muted text-muted-foreground'
        )}>
          {selected && !showCheck ? (
            <Check className="w-6 h-6 text-white animate-[scaleIn_0.2s_ease-out]" />
          ) : (
            letter
          )}
        </div>

        {/* Answer Text */}
        <div className={cn(
          'flex-1 text-lg font-normal transition-all duration-300',
          selected && 'font-medium'
        )}>
          {text}
        </div>

        {/* Live Count Display */}
        {showLiveCount && (
          <div className="flex-shrink-0 min-w-[3rem] text-right">
            <span className={cn(
              'text-2xl font-bold tabular-nums transition-all duration-300',
              count > 0 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {count}
            </span>
          </div>
        )}

        {/* Checkmark for multiple-choice selected */}
        {showCheck && selected && (
          <div className="flex-shrink-0 animate-[scaleIn_0.2s_ease-out]">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              `bg-gradient-to-br ${colors.badge}`
            )}>
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Inline keyframes for the animations */}
      <style jsx>{`
        @keyframes confirmPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
