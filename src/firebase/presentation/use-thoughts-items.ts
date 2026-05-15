'use client';

import { useState, useEffect } from 'react';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import { logError } from '@/lib/error-logging';

interface ThoughtsSourceRef {
  sourceSlideId: string;
  sourceElementId: string;
  mode: 'raw' | 'groups';
}

interface DynamicItem {
  id: string;
  text: string;
  description?: string;
}

interface TopicEntry {
  topic: string;
  description: string;
  count: number;
  variations: string[];
  submissionIds: string[];
}

export function useThoughtsItems(
  gameId: string,
  thoughtsSourceRef?: ThoughtsSourceRef
): { items: DynamicItem[] | null; isLoading: boolean } {
  const firestore = useFirestore();
  const functions = useFunctions();
  const [items, setItems] = useState<DynamicItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(!!thoughtsSourceRef);
  const [groupingTriggered, setGroupingTriggered] = useState(false);

  const mode = thoughtsSourceRef?.mode;
  const sourceElementId = thoughtsSourceRef?.sourceElementId;

  // Groups mode: subscribe to topics aggregate
  useEffect(() => {
    if (!firestore || !gameId || !sourceElementId || mode !== 'groups') {
      if (mode !== 'raw') {
        setItems(null);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const topicsDocId = `topics-${sourceElementId}`;
    const topicsRef = doc(firestore, 'games', gameId, 'aggregates', topicsDocId);

    const unsubscribe = onSnapshot(topicsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const topics = (data.topics || []) as TopicEntry[];
        if (topics.length > 0) {
          setItems(
            topics.map((t, i) => ({
              id: `topic-${i}`,
              text: t.topic,
              description: t.description,
            }))
          );
        } else {
          setItems(null);
        }
        setIsLoading(false);
      } else {
        setItems(null);
        setIsLoading(false);
        // Auto-trigger grouping if not yet attempted
        if (!groupingTriggered && functions) {
          setGroupingTriggered(true);
          setIsLoading(true);
          const fn = httpsCallable(functions, 'extractTopics');
          fn({ gameId, elementId: sourceElementId }).catch(() => {
            setIsLoading(false);
          });
        }
      }
    }, (err) => {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'useThoughtsItems:groups',
        additionalInfo: { gameId, sourceElementId },
      });
      setItems(null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, functions, gameId, sourceElementId, mode, groupingTriggered]);

  // Raw mode: subscribe to responses
  useEffect(() => {
    if (!firestore || !gameId || !sourceElementId || mode !== 'raw') {
      if (mode !== 'groups') {
        setItems(null);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const responsesRef = collection(firestore, 'games', gameId, 'responses');
    const responsesQuery = query(responsesRef, where('elementId', '==', sourceElementId));

    const unsubscribe = onSnapshot(responsesQuery, (snapshot) => {
      if (snapshot.empty) {
        setItems(null);
        setIsLoading(false);
        return;
      }

      const rawItems: DynamicItem[] = [];
      const seen = new Set<string>();

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const textAnswers = (data.textAnswers || []) as string[];
        textAnswers.forEach((text, idx) => {
          if (text && !seen.has(text)) {
            seen.add(text);
            rawItems.push({
              id: `${docSnap.id}-${idx}`,
              text,
            });
          }
        });
      }

      setItems(rawItems.length > 0 ? rawItems : null);
      setIsLoading(false);
    }, (err) => {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: 'useThoughtsItems:raw',
        additionalInfo: { gameId, sourceElementId },
      });
      setItems(null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId, sourceElementId, mode]);

  return { items, isLoading };
}
