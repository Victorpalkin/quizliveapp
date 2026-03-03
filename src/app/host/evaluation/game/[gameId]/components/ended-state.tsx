'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { EvaluationResultsDisplay } from '@/components/app/evaluation-results-display';
import type { EvaluationResults, EvaluationItem, EvaluationMetric } from '@/lib/types';

interface EndedStateProps {
  gamePin: string;
  evaluationResults: EvaluationResults | null;
  ratingsCount: number;
  approvedItems: EvaluationItem[];
  metrics: EvaluationMetric[];
  resultsLoading: boolean;
  isTransitioning: boolean;
  handleReopenKeepData: () => void;
  handleReopenClearData: () => void;
  onBackToDashboard: () => void;
}

export function EndedState({
  gamePin,
  evaluationResults,
  ratingsCount,
  approvedItems,
  metrics,
  resultsLoading,
  isTransitioning,
  handleReopenKeepData,
  handleReopenClearData,
  onBackToDashboard,
}: EndedStateProps) {
  return (
    <>
      <Card className="border border-card-border shadow-sm">
        <CardHeader>
          <CardTitle>Session Results</CardTitle>
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

      {/* Reopen Options */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Continue This Session?
          </CardTitle>
          <CardDescription>
            Reopen to collect more ratings from additional participants. The same PIN ({gamePin}) will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleReopenKeepData}
            disabled={isTransitioning}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
          >
            {isTransitioning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reopen & Keep Existing Ratings
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1" disabled={isTransitioning}>
                <Trash2 className="h-4 w-4 mr-2" />
                Reopen & Start Fresh
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all existing data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all ratings and results. You&apos;ll start with the same items but no participant data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReopenClearData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Clear & Reopen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={onBackToDashboard}
        size="lg"
        className="w-full"
      >
        Back to Dashboard
      </Button>
    </>
  );
}
