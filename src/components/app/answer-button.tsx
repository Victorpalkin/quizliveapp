'use client';

import { cn } from '@/lib/utils';
import { ANSWER_COLOR_GRADIENTS } from '@/lib/colors';
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
  const colors = ANSWER_COLOR_GRADIENTS[colorIndex % ANSWER_COLOR_GRADIENTS.length];

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
