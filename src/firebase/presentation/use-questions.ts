'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  query,
  orderBy,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { removeUndefined } from '@/lib/firestore-utils';
import type { PresentationQuestion } from '@/lib/types';

/** Hook for Q&A question submission, upvoting, and moderation */
export function useQuestions(gameId: string | null) {
  const firestore = useFirestore();
  const [questions, setQuestions] = useState<PresentationQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to Q&A questions, sorted by upvotes (descending)
  useEffect(() => {
    if (!firestore || !gameId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'games', gameId, 'questions'),
      orderBy('upvotes', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text,
          playerId: data.playerId,
          playerName: data.playerName,
          upvotes: data.upvotes ?? 0,
          upvotedBy: data.upvotedBy ?? [],
          answered: data.answered ?? false,
          pinned: data.pinned ?? false,
          createdAt: data.createdAt,
        } as PresentationQuestion;
      });
      setQuestions(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  /** Submit a new question */
  const submitQuestion = useCallback(
    async (playerId: string, playerName: string, text: string) => {
      if (!firestore || !gameId) return;

      await addDoc(collection(firestore, 'games', gameId, 'questions'), removeUndefined({
        text: text.trim(),
        playerId,
        playerName,
        upvotes: 0,
        upvotedBy: [],
        answered: false,
        pinned: false,
        createdAt: serverTimestamp(),
      }));
    },
    [firestore, gameId]
  );

  /** Upvote a question (idempotent per player) */
  const upvoteQuestion = useCallback(
    async (questionId: string, playerId: string) => {
      if (!firestore || !gameId) return;

      // Check if already upvoted (optimistic, server rules enforce)
      const q = questions.find((q) => q.id === questionId);
      if (q?.upvotedBy.includes(playerId)) return;

      await updateDoc(doc(firestore, 'games', gameId, 'questions', questionId), {
        upvotes: increment(1),
        upvotedBy: arrayUnion(playerId),
      });
    },
    [firestore, gameId, questions]
  );

  /** Mark question as answered (host only) */
  const markAnswered = useCallback(
    async (questionId: string, answered: boolean) => {
      if (!firestore || !gameId) return;
      await updateDoc(doc(firestore, 'games', gameId, 'questions', questionId), { answered });
    },
    [firestore, gameId]
  );

  /** Pin/unpin question (host only) */
  const togglePin = useCallback(
    async (questionId: string, pinned: boolean) => {
      if (!firestore || !gameId) return;
      await updateDoc(doc(firestore, 'games', gameId, 'questions', questionId), { pinned });
    },
    [firestore, gameId]
  );

  /** Delete question (host only) */
  const deleteQuestion = useCallback(
    async (questionId: string) => {
      if (!firestore || !gameId) return;
      await deleteDoc(doc(firestore, 'games', gameId, 'questions', questionId));
    },
    [firestore, gameId]
  );

  return {
    questions,
    loading,
    submitQuestion,
    upvoteQuestion,
    markAnswered,
    togglePin,
    deleteQuestion,
  };
}
