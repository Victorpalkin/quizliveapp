'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirestore, useFunctions } from '@/firebase';
import { removeUndefined } from '@/lib/firestore-utils';
import type { PresentationGame, PresentationGameState, PresentationSettings } from '@/lib/types';
import { nanoid } from 'nanoid';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  maxStreak: number;
  joinedAt: Date;
}

/** Hook to create a presentation game session */
export function useCreatePresentationGame() {
  const firestore = useFirestore();
  const functions = useFunctions();

  const createGame = useCallback(
    async (presentationId: string, hostId: string, settings: PresentationSettings): Promise<string> => {
      if (!firestore) throw new Error('Firestore not initialized');

      const gameDoc = await addDoc(collection(firestore, 'games'), removeUndefined({
        hostId,
        gamePin: nanoid(8).toUpperCase(),
        activityType: 'presentation',
        presentationId,
        state: 'lobby',
        currentSlideIndex: 0,
        settings,
        createdAt: serverTimestamp(),
      }));

      // Initialize answer key and leaderboard via Cloud Function
      if (functions) {
        const initGame = httpsCallable(functions, 'initPresentationGame');
        await initGame({ gameId: gameDoc.id, presentationId });
      }

      return gameDoc.id;
    },
    [firestore, functions]
  );

  return { createGame };
}

/** Hook to subscribe to game state and players */
export function usePresentationGame(gameId: string | null) {
  const firestore = useFirestore();
  const [game, setGame] = useState<PresentationGame | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to game document
  useEffect(() => {
    if (!firestore || !gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(firestore, 'games', gameId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGame({
          id: snapshot.id,
          hostId: data.hostId,
          gamePin: data.gamePin,
          activityType: 'presentation',
          presentationId: data.presentationId,
          state: data.state,
          currentSlideIndex: data.currentSlideIndex ?? 0,
          settings: data.settings,
          createdAt: toDate(data.createdAt),
        });
      } else {
        setGame(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  // Subscribe to players subcollection
  useEffect(() => {
    if (!firestore || !gameId) {
      setPlayers([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(firestore, 'games', gameId, 'players'),
      (snapshot) => {
        const playerList = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            score: data.score ?? 0,
            streak: data.currentStreak ?? 0,
            maxStreak: data.maxStreak ?? 0,
            joinedAt: toDate(data.joinedAt),
          };
        });
        setPlayers(playerList);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId]);

  return { game, players, loading };
}

/** Hook for host game controls */
export function usePresentationControls(gameId: string | null) {
  const firestore = useFirestore();

  const updateState = useCallback(
    async (state: PresentationGameState) => {
      if (!firestore || !gameId) return;
      await updateDoc(doc(firestore, 'games', gameId), { state });
    },
    [firestore, gameId]
  );

  const goToSlide = useCallback(
    async (slideIndex: number) => {
      if (!firestore || !gameId) return;
      await updateDoc(doc(firestore, 'games', gameId), { currentSlideIndex: slideIndex });
    },
    [firestore, gameId]
  );

  const nextSlide = useCallback(
    async (currentIndex: number, totalSlides: number) => {
      if (currentIndex < totalSlides - 1) {
        await goToSlide(currentIndex + 1);
      }
    },
    [goToSlide]
  );

  const prevSlide = useCallback(
    async (currentIndex: number) => {
      if (currentIndex > 0) {
        await goToSlide(currentIndex - 1);
      }
    },
    [goToSlide]
  );

  const startPresentation = useCallback(async () => {
    await updateState('active');
  }, [updateState]);

  const pausePresentation = useCallback(async () => {
    await updateState('paused');
  }, [updateState]);

  const endPresentation = useCallback(async () => {
    await updateState('ended');
  }, [updateState]);

  const deleteGame = useCallback(async () => {
    if (!firestore || !gameId) return;
    await deleteDoc(doc(firestore, 'games', gameId));
  }, [firestore, gameId]);

  return {
    startPresentation,
    pausePresentation,
    endPresentation,
    nextSlide,
    prevSlide,
    goToSlide,
    deleteGame,
  };
}
