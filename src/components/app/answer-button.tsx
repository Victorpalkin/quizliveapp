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
}: AnswerButtonProps) {
  const colors = colorGradients[colorIndex % colorGradients.length];

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

        // Interactive states
        !disabled && 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',

        // Selected state - gradient left border
        selected && [
          'border-l-4',
          `bg-gradient-to-r ${colors.selectedBg}`,
          'shadow-xl',
          // Add gradient border using pseudo-element
          'relative',
          'before:absolute before:left-0 before:top-0 before:h-full before:w-1',
          `before:bg-gradient-to-b ${colors.selectedBorder}`,
          'before:rounded-l-xl',
        ],

        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Letter Badge */}
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
          'text-xl font-semibold transition-colors',
          selected
            ? `bg-gradient-to-br ${colors.badge} text-white`
            : 'bg-muted text-muted-foreground'
        )}>
          {letter}
        </div>

        {/* Answer Text */}
        <div className="flex-1 text-lg font-normal">
          {text}
        </div>

        {/* Checkmark for selected */}
        {showCheck && selected && (
          <div className="flex-shrink-0">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              `bg-gradient-to-br ${colors.badge}`
            )}>
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
