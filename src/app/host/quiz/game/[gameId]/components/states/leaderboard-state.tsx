'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeaderboardView } from '../visualizations/leaderboard-view';
import { AnswerDistributionChart } from '../visualizations/answer-distribution-chart';
import { SliderResultsView } from '../visualizations/slider-results-view';
import { FreeResponseResultsView } from '../visualizations/free-response-results-view';
import type { Question, LeaderboardEntry } from '@/lib/types';

interface AnswerDistributionData {
  name: string;
  total: number;
  isCorrect: boolean;
}

interface LeaderboardStateProps {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  totalAnswered: number;
  question: Question | undefined;
  quizQuestion: Question | undefined;
  answerDistribution: AnswerDistributionData[];
  isComputingResults: boolean;
  computeError: string | null;
  onRetry: () => void;
}

export function LeaderboardState({
  topPlayers,
  totalPlayers,
  totalAnswered,
  question,
  quizQuestion,
  answerDistribution,
  isComputingResults,
  computeError,
  onRetry,
}: LeaderboardStateProps) {
  if (isComputingResults) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Calculating results...</p>
      </main>
    );
  }

  if (computeError) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-destructive font-medium">Error computing results</p>
        <p className="text-sm text-muted-foreground max-w-md text-center">{computeError}</p>
        <Button onClick={onRetry} variant="outline">
          Retry
        </Button>
      </main>
    );
  }

  const renderResults = () => {
    if (question?.type === 'slide') {
      return (
        <Card className="w-full max-w-2xl flex-1">
          <CardContent className="p-8 text-center space-y-4">
            <Badge variant="secondary" className="text-lg">Informational Content</Badge>
            <p className="text-lg text-muted-foreground">
              This was an informational slide. No scoring applied.
            </p>
            <div className="space-y-2 pt-4">
              <h3 className="text-2xl font-bold text-primary">{question.text}</h3>
              {question.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">{question.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (question?.type === 'slider' && quizQuestion?.type === 'slider') {
      return (
        <SliderResultsView
          correctValue={quizQuestion.correctValue}
          minValue={quizQuestion.minValue}
          maxValue={quizQuestion.maxValue}
          unit={quizQuestion.unit}
          totalAnswered={totalAnswered}
        />
      );
    }

    if (question?.type === 'free-response' && quizQuestion?.type === 'free-response') {
      return (
        <FreeResponseResultsView
          correctAnswer={quizQuestion.correctAnswer}
          alternativeAnswers={quizQuestion.alternativeAnswers}
          totalAnswered={totalAnswered}
        />
      );
    }

    return <AnswerDistributionChart data={answerDistribution} />;
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 md:flex-row md:items-start">
      <LeaderboardView topPlayers={topPlayers} totalPlayers={totalPlayers} />
      {renderResults()}
    </main>
  );
}
