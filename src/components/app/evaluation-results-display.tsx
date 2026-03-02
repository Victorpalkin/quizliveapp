'use client';

import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvaluationBarChart } from '@/components/app/evaluation-bar-chart';
import { EvaluationHeatmap } from '@/components/app/evaluation-heatmap';
import { EvaluationMatrix } from '@/components/app/evaluation-matrix';
import { ConsensusList } from '@/components/app/consensus-indicator';
import type { EvaluationMetric, EvaluationResults } from '@/lib/types';

interface EvaluationResultsDisplayProps {
  results: EvaluationResults | null | undefined;
  metrics: EvaluationMetric[];
  loading?: boolean;
}

export function EvaluationResultsDisplay({ results, metrics, loading }: EvaluationResultsDisplayProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!results?.items || results.items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No results available.
      </p>
    );
  }

  return (
    <Tabs defaultValue="ranking" className="w-full">
      <TabsList className={`grid w-full mb-4 ${metrics.length >= 2 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="ranking">Results</TabsTrigger>
        <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        {metrics.length >= 2 && (
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
        )}
        <TabsTrigger value="consensus">Consensus</TabsTrigger>
      </TabsList>

      <TabsContent value="ranking" className="mt-0">
        <EvaluationBarChart items={results.items} />
      </TabsContent>

      <TabsContent value="heatmap" className="mt-0">
        <EvaluationHeatmap items={results.items} metrics={metrics} />
      </TabsContent>

      {metrics.length >= 2 && (
        <TabsContent value="matrix" className="mt-0">
          <EvaluationMatrix items={results.items} metrics={metrics} />
        </TabsContent>
      )}

      <TabsContent value="consensus" className="mt-0">
        <ConsensusList items={results.items} />
      </TabsContent>
    </Tabs>
  );
}
