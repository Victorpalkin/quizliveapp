'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { ElementStats } from './use-analytics';
import type {
  PresentationSlide,
  TopicEntry,
  ThoughtSubmission,
  EvaluationResults,
  EvaluationMetric,
} from '@/lib/types';
import type { AgenticDesignerSession } from '@/lib/types/agentic-designer';

export interface SlideAggregates {
  topicsMap: Record<string, TopicEntry[]>;
  evaluationResultsMap: Record<string, EvaluationResults>;
  evaluationMetricsMap: Record<string, EvaluationMetric[]>;
  thoughtsResponsesMap: Record<string, ThoughtSubmission[]>;
  agenticSessionsMap: Record<string, AgenticDesignerSession>;
  loading: boolean;
}

export function useSlideAggregates(
  gameId: string,
  elementStats: ElementStats[],
  slides?: PresentationSlide[]
): SlideAggregates {
  const firestore = useFirestore();
  const [data, setData] = useState<Omit<SlideAggregates, 'loading'>>({
    topicsMap: {},
    evaluationResultsMap: {},
    evaluationMetricsMap: {},
    thoughtsResponsesMap: {},
    agenticSessionsMap: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId || !slides || slides.length === 0) {
      setLoading(false);
      return;
    }

    const allElements = slides.flatMap((slide) =>
      slide.elements.map((el) => ({ ...el, slideId: slide.id }))
    );

    const thoughtsElementIds: string[] = [];
    const thoughtsResultsSourceIds: string[] = [];
    const evaluationSourceIds: string[] = [];
    const evaluationConfigs: Record<string, EvaluationMetric[]> = {};
    const agenticElementIds: string[] = [];

    for (const el of allElements) {
      if (el.type === 'thoughts') {
        thoughtsElementIds.push(el.id);
      } else if (el.type === 'thoughts-results' && el.sourceElementId) {
        thoughtsResultsSourceIds.push(el.sourceElementId);
        if (!thoughtsElementIds.includes(el.sourceElementId)) {
          thoughtsElementIds.push(el.sourceElementId);
        }
      } else if (el.type === 'evaluation-results' && el.sourceElementId) {
        evaluationSourceIds.push(el.sourceElementId);
        const sourceEl = allElements.find((e) => e.id === el.sourceElementId);
        if (sourceEl?.evaluationConfig?.metrics) {
          evaluationConfigs[el.sourceElementId] = sourceEl.evaluationConfig.metrics.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            scaleType: m.scaleType,
            scaleMin: m.scaleMin,
            scaleMax: m.scaleMax,
            scaleLabels: m.scaleLabels,
            weight: m.weight,
            lowerIsBetter: m.lowerIsBetter,
          }));
        }
      } else if (
        el.type === 'agentic-designer' ||
        el.type === 'agentic-designer-results'
      ) {
        const targetId = el.type === 'agentic-designer-results' ? el.sourceElementId : el.id;
        if (targetId && !agenticElementIds.includes(targetId)) {
          agenticElementIds.push(targetId);
        }
      }
    }

    const fetchAll = async () => {
      const topicsMap: Record<string, TopicEntry[]> = {};
      const evaluationResultsMap: Record<string, EvaluationResults> = {};
      const thoughtsResponsesMap: Record<string, ThoughtSubmission[]> = {};
      const agenticSessionsMap: Record<string, AgenticDesignerSession> = {};

      const promises: Promise<void>[] = [];

      // Fetch topics aggregates
      const uniqueTopicIds = [...new Set([...thoughtsElementIds, ...thoughtsResultsSourceIds])];
      for (const elementId of uniqueTopicIds) {
        promises.push(
          getDoc(doc(firestore, 'games', gameId, 'aggregates', `topics-${elementId}`))
            .then((snap) => {
              if (snap.exists()) {
                topicsMap[elementId] = snap.data().topics || [];
              }
            })
            .catch(() => {})
        );
      }

      // Fetch thoughts responses (raw submissions)
      for (const elementId of uniqueTopicIds) {
        promises.push(
          getDocs(query(
            collection(firestore, 'games', gameId, 'responses'),
            where('elementId', '==', elementId)
          ))
            .then((snap) => {
              const submissions: ThoughtSubmission[] = [];
              snap.docs.forEach((d) => {
                const r = d.data();
                const texts = r.textAnswers || [];
                texts.forEach((text: string, i: number) => {
                  submissions.push({
                    id: `${d.id}-${i}`,
                    playerId: r.playerId,
                    playerName: r.playerName,
                    rawText: text,
                    submittedAt: r.submittedAt,
                  });
                });
              });
              thoughtsResponsesMap[elementId] = submissions;
            })
            .catch(() => {})
        );
      }

      // Fetch evaluation results aggregates
      for (const elementId of evaluationSourceIds) {
        promises.push(
          getDoc(doc(firestore, 'games', gameId, 'aggregates', `evaluation-${elementId}`))
            .then((snap) => {
              if (snap.exists()) {
                evaluationResultsMap[elementId] = snap.data() as EvaluationResults;
              }
            })
            .catch(() => {})
        );
      }

      // Fetch agentic sessions
      for (const elementId of agenticElementIds) {
        promises.push(
          getDoc(doc(firestore, 'games', gameId, 'agenticSessions', elementId))
            .then((snap) => {
              if (snap.exists()) {
                agenticSessionsMap[elementId] = snap.data() as AgenticDesignerSession;
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);

      setData({
        topicsMap,
        evaluationResultsMap,
        evaluationMetricsMap: evaluationConfigs,
        thoughtsResponsesMap,
        agenticSessionsMap,
      });
      setLoading(false);
    };

    fetchAll();
  }, [firestore, gameId, slides, elementStats]);

  return { ...data, loading };
}
