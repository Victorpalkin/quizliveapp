import { Badge } from '@/components/ui/badge';
import type { MultipleChoiceQuestion } from '@/lib/types';

interface QuestionTypeBadgesProps {
  question: MultipleChoiceQuestion;
}

/**
 * Displays badges for multiple-choice questions showing:
 * - Number of correct answers
 * - Scoring mode (proportional scoring)
 */
export function QuestionTypeBadges({ question }: QuestionTypeBadgesProps) {
  if (question.type !== 'multiple-choice') {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Badge variant="secondary" className="text-sm">
        Multiple Answers ({question.correctAnswerIndices.length})
      </Badge>
      <Badge variant="default" className="text-sm">
        Proportional Scoring
      </Badge>
    </div>
  );
}
