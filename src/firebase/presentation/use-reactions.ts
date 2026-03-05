'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limitToLast,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { removeUndefined } from '@/lib/firestore-utils';
import type { PresentationReaction } from '@/lib/types';

const RATE_LIMIT_MS = 2000; // 1 reaction per 2 seconds per player

/** Hook to send and subscribe to live reactions */
export function useReactions(gameId: string | null) {
  const firestore = useFirestore();
  const [reactions, setReactions] = useState<PresentationReaction[]>([]);
  const lastSentRef = useRef(0);

  // Subscribe to recent reactions (last 50 for performance)
  useEffect(() => {
    if (!firestore || !gameId) {
      setReactions([]);
      return;
    }

    const q = query(
      collection(firestore, 'games', gameId, 'reactions'),
      orderBy('timestamp', 'asc'),
      limitToLast(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          playerId: data.playerId,
          emoji: data.emoji,
          timestamp: data.timestamp,
        } as PresentationReaction;
      });
      setReactions(items);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  /** Send a reaction (rate-limited) */
  const sendReaction = useCallback(
    async (playerId: string, emoji: string) => {
      if (!firestore || !gameId) return;

      // Client-side rate limit
      const now = Date.now();
      if (now - lastSentRef.current < RATE_LIMIT_MS) return;
      lastSentRef.current = now;

      await addDoc(collection(firestore, 'games', gameId, 'reactions'), removeUndefined({
        playerId,
        emoji,
        timestamp: serverTimestamp(),
      }));
    },
    [firestore, gameId]
  );

  return { reactions, sendReaction };
}

/** Hook to get accumulated reaction counts (all-time, not limited to 50) */
export function useReactionCounts(gameId: string | null): Map<string, number> {
  const firestore = useFirestore();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!firestore || !gameId) {
      setCounts(new Map());
      return;
    }

    const unsubscribe = onSnapshot(
      collection(firestore, 'games', gameId, 'reactions'),
      (snapshot) => {
        const map = new Map<string, number>();
        for (const doc of snapshot.docs) {
          const emoji = doc.data().emoji as string;
          map.set(emoji, (map.get(emoji) ?? 0) + 1);
        }
        setCounts(map);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId]);

  return counts;
}
