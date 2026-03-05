'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EvaluationResultsDisplay } from '@/components/app/evaluation-results-display';
import type { EvaluationResults, EvaluationItem, EvaluationMetric } from '@/lib/types';

interface ResultsStateProps {
  evaluationResults: EvaluationResults | null;
  ratingsCount: number;
  approvedItems: EvaluationItem[];
  metrics: EvaluationMetric[];
  resultsLoading: boolean;
  handleEndSession: () => void;
}

export function ResultsState({
  evaluationResults,
  ratingsCount,
  approvedItems,
  metrics,
  resultsLoading,
  handleEndSession,
}: ResultsStateProps) {
  return (
    <>
      <Card className="border border-card-border shadow-sm">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {evaluationResults?.participantsWhoRated || ratingsCount} participants rated {evaluationResults?.items.length || approvedItems.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvaluationResultsDisplay
            results={evaluationResults}
            metrics={metrics}
            loading={resultsLoading}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleEndSession}
        size="lg"
        className="w-full"
      >
        End Session & Return to Dashboard
      </Button>
    </>
  );
}
