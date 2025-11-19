interface QuestionCounterProps {
  current: number;
  total: number;
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Displays current question number out of total questions
 * e.g., "Question 3 / 10" or "Question 3 of 10"
 */
export function QuestionCounter({ current, total, variant = 'compact', className }: QuestionCounterProps) {
  const separator = variant === 'compact' ? '/' : 'of';

  return (
    <span className={className}>
      Question {current} {separator} {total}
    </span>
  );
}
