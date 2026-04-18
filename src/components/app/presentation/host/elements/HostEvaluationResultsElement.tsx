'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import { useElementResponses, useDynamicItems } from '@/firebase/presentation';
import { EvaluationResultsDisplay } from '@/components/app/evaluation-results-display';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import type { SlideElement, PresentationSlide, EvaluationResults, EvaluationMetric } from '@/lib/types';

interface HostEvaluationResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostEvaluationResultsElement({ element, slides, gameId }: HostEvaluationResultsElementProps) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [results, setResults] = useState<EvaluationResults | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.evaluationConfig;

  // Load dynamic items from AI step if configured on source element
  const { items: aiStepItems } = useDynamicItems(gameId, sourceElement?.dynamicItemsSource);

  // Build metrics array from config for the display component
  const metrics: EvaluationMetric[] = config?.metrics?.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    scaleType: m.scaleType,
    scaleMin: m.scaleMin,
    scaleMax: m.scaleMax,
    scaleLabels: m.scaleLabels,
    weight: m.weight,
    lowerIsBetter: m.lowerIsBetter,
  })) || [];

  // Subscribe to responses for auto-trigger detection
  const responses = useElementResponses(gameId, element.sourceElementId || null);

  // Subscribe to evaluation results aggregate
  useEffect(() => {
    if (!firestore || !element.sourceElementId) return;

    const resultsDocId = `evaluation-${element.sourceElementId}`;
    const unsubscribe = onSnapshot(
      doc(firestore, 'games', gameId, 'aggregates', resultsDocId),
      (snapshot) => {
        if (snapshot.exists()) {
          setResults(snapshot.data() as EvaluationResults);
          setHasResults(true);
        } else {
          setResults(null);
          setHasResults(false);
        }
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, element.sourceElementId]);

  // Auto-trigger computation when results don't exist but responses are available
  useEffect(() => {
    if (!hasResults && responses.length > 0 && !processing && functions && element.sourceElementId) {
      triggerComputation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResults, responses.length, processing, functions, element.sourceElementId]);

  // Merge dynamic items into config for computation
  const effectiveConfig = config && aiStepItems
    ? { ...config, items: aiStepItems }
    : config;

  const triggerComputation = useCallback(async () => {
    if (!functions || !element.sourceElementId || !effectiveConfig) return;
    setProcessing(true);
    try {
      const fn = httpsCallable(functions, 'computePresentationEvaluationResults');
      await fn({
        gameId,
        elementId: element.sourceElementId,
        evaluationConfig: effectiveConfig,
      });
    } catch {
      // Results subscription will update when ready
    } finally {
      setProcessing(false);
    }
  }, [functions, gameId, element.sourceElementId, effectiveConfig]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source evaluation element linked
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xl font-bold">{config.title} - Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerComputation}
          disabled={processing || responses.length === 0}
        >
          {processing ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {processing ? 'Processing...' : 'Re-compute'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EvaluationResultsDisplay
          results={results}
          metrics={metrics}
          loading={processing && !results}
        />
      </div>
    </div>
  );
}
