import { Badge } from '@/components/ui/badge';
import type { Question } from '@/lib/types';

interface QuestionTypeBadgesProps {
  question: Question;
}

/**
 * Displays badges for all question types showing:
 * - Question type indicator
 * - Type-specific metadata (e.g., answer count, scoring mode)
 */
export function QuestionTypeBadges({ question }: QuestionTypeBadgesProps) {
  switch (question.type) {
    case 'single-choice':
      return (
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            Single Answer
          </Badge>
          <Badge variant="default" className="text-sm">
            Time-Based Scoring
          </Badge>
        </div>
      );

    case 'multiple-choice':
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

    case 'slider':
      return (
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            Slider Question
          </Badge>
          <Badge variant="default" className="text-sm">
            Range: {question.minValue}{question.unit} - {question.maxValue}{question.unit}
          </Badge>
        </div>
      );

    case 'slide':
      return (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Informational Slide
          </Badge>
          <Badge variant="outline" className="text-sm">
            No Scoring
          </Badge>
        </div>
      );

    case 'poll-single':
      return (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Poll - Single Answer
          </Badge>
          <Badge variant="outline" className="text-sm">
            No Scoring
          </Badge>
        </div>
      );

    case 'poll-multiple':
      return (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Poll - Multiple Answers
          </Badge>
          <Badge variant="outline" className="text-sm">
            No Scoring
          </Badge>
        </div>
      );

    default:
      return null;
  }
}
