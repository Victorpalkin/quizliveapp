'use client';

import { Badge } from '@/components/ui/badge';
import { AlignLeft } from 'lucide-react';
import type { PollQuestion } from '@/lib/types';

interface AnswerDistribution {
  [answerIndex: number]: number;
}

export function PollResultsChart({ question, distribution, totalResponses }: {
  question: PollQuestion;
  distribution: AnswerDistribution;
  totalResponses: number;
}) {
  if (question.type === 'poll-free-text') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlignLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Free text responses will be grouped by AI</p>
        <p className="text-sm">{totalResponses} response{totalResponses !== 1 ? 's' : ''} collected</p>
      </div>
    );
  }

  if (!('answers' in question)) return null;

  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-4">
      {question.answers.map((answer, index) => {
        const count = distribution[index] || 0;
        const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium">{answer.text}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{count} vote{count !== 1 ? 's' : ''}</span>
                <Badge variant="secondary">{percentage}%</Badge>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
