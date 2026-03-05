'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import { useElementResponses } from '@/firebase/presentation';
import { ThoughtsGroupedView } from '@/components/app/thoughts-grouped-view';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import type { SlideElement, PresentationSlide, TopicEntry, ThoughtSubmission } from '@/lib/types';

interface HostThoughtsResultsElementProps {
  element: SlideElement;
  slides: PresentationSlide[];
  gameId: string;
}

export function HostThoughtsResultsElement({ element, slides, gameId }: HostThoughtsResultsElementProps) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [topics, setTopics] = useState<TopicEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [hasTopics, setHasTopics] = useState(false);

  const sourceSlide = slides.find((s) => s.id === element.sourceSlideId);
  const sourceElement = sourceSlide?.elements.find((el) => el.id === element.sourceElementId);
  const config = sourceElement?.thoughtsConfig;

  // Subscribe to responses for the source element
  const responses = useElementResponses(gameId, element.sourceElementId || null);

  // Build ThoughtSubmission-compatible data from responses
  const submissions: ThoughtSubmission[] = [];
  responses.forEach((r) => {
    if (r.textAnswers) {
      r.textAnswers.forEach((text, i) => {
        submissions.push({
          id: `${r.id}-${i}`,
          playerId: r.playerId,
          playerName: r.playerName,
          rawText: text,
          submittedAt: r.submittedAt,
        });
      });
    }
  });

  // Subscribe to topics aggregate
  useEffect(() => {
    if (!firestore || !element.sourceElementId) return;

    const topicsDocId = `topics-${element.sourceElementId}`;
    const unsubscribe = onSnapshot(
      doc(firestore, 'games', gameId, 'aggregates', topicsDocId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTopics(data.topics || []);
          setHasTopics(true);
        } else {
          setTopics([]);
          setHasTopics(false);
        }
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId, element.sourceElementId]);

  // Auto-trigger extractTopics when topics don't exist and responses are available
  useEffect(() => {
    if (!hasTopics && submissions.length > 0 && !processing && functions && element.sourceElementId) {
      triggerExtractTopics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTopics, submissions.length, processing, functions, element.sourceElementId]);

  const triggerExtractTopics = useCallback(async () => {
    if (!functions || !element.sourceElementId) return;
    setProcessing(true);
    try {
      const fn = httpsCallable(functions, 'extractTopics');
      await fn({ gameId, elementId: element.sourceElementId });
    } catch {
      // Topics subscription will update when ready
    } finally {
      setProcessing(false);
    }
  }, [functions, gameId, element.sourceElementId]);

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No source thoughts element linked
      </div>
    );
  }

  if (processing) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground">Analyzing responses with AI...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xl font-bold">{config.prompt}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerExtractTopics}
          disabled={processing || submissions.length === 0}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Re-process
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {topics.length > 0 ? (
          <ThoughtsGroupedView topics={topics} submissions={submissions} />
        ) : submissions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No responses yet
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>{submissions.length} response{submissions.length !== 1 ? 's' : ''} ready for processing</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-2 flex-shrink-0">
        {submissions.length} thought{submissions.length !== 1 ? 's' : ''} &middot; {topics.length} group{topics.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
