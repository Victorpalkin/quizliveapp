'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
  getDoc,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { PresentationGame, PresentationGameState, Player } from '@/lib/types';

/**
 * Generate a random 6-character game PIN
 */
function generateGamePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

/**
 * Hook to get a presentation game by ID
 */
export function usePresentationGame(gameId: string | null | undefined) {
  const firestore = useFirestore();
  const [game, setGame] = useState<PresentationGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const gameRef = useMemo(() => {
    if (!firestore || !gameId) return null;
    return doc(firestore, 'games', gameId) as DocumentReference<PresentationGame>;
  }, [firestore, gameId]);

  useEffect(() => {
    if (!gameRef) {
      setGame(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGame({ ...snapshot.data(), id: snapshot.id } as PresentationGame);
        } else {
          setGame(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching game:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameRef]);

  return { game, loading, error, gameRef };
}

/**
 * Hook to get a presentation game by PIN (for players joining)
 */
export function usePresentationGameByPin(gamePin: string | null | undefined) {
  const firestore = useFirestore();
  const [game, setGame] = useState<PresentationGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !gamePin) {
      setGame(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const gamesQuery = query(
      collection(firestore, 'games'),
      where('gamePin', '==', gamePin.toUpperCase()),
      where('activityType', '==', 'presentation')
    );

    const unsubscribe = onSnapshot(
      gamesQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setGame({ ...doc.data(), id: doc.id } as PresentationGame);
        } else {
          setGame(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching game by PIN:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gamePin]);

  return { game, loading, error };
}

/**
 * Hook to get players in a presentation game
 */
export function usePresentationPlayers(gameId: string | null | undefined) {
  const firestore = useFirestore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const playersRef = collection(firestore, 'games', gameId, 'players');

    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerDocs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Player[];
        setPlayers(playerDocs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching players:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, gameId]);

  return { players, playerCount: players.length, loading };
}

/**
 * Hook to manage presentation game state
 */
export function usePresentationGameControls(gameId: string | null | undefined) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const gameRef = useMemo(() => {
    if (!firestore || !gameId) return null;
    return doc(firestore, 'games', gameId);
  }, [firestore, gameId]);

  const updateGameState = useCallback(
    async (state: PresentationGameState) => {
      if (!gameRef) return;
      setIsLoading(true);
      try {
        await updateDoc(gameRef, { state });
      } finally {
        setIsLoading(false);
      }
    },
    [gameRef]
  );

  const goToSlide = useCallback(
    async (slideIndex: number) => {
      if (!gameRef) return;
      setIsLoading(true);
      try {
        await updateDoc(gameRef, {
          currentSlideIndex: slideIndex,
          state: 'presenting' as PresentationGameState,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [gameRef]
  );

  const nextSlide = useCallback(
    async (currentIndex: number, totalSlides: number) => {
      if (currentIndex < totalSlides - 1) {
        await goToSlide(currentIndex + 1);
      } else {
        await updateGameState('ended');
      }
    },
    [goToSlide, updateGameState]
  );

  const previousSlide = useCallback(
    async (currentIndex: number) => {
      if (currentIndex > 0) {
        await goToSlide(currentIndex - 1);
      }
    },
    [goToSlide]
  );

  const startPresentation = useCallback(async () => {
    await goToSlide(0);
  }, [goToSlide]);

  const endPresentation = useCallback(async () => {
    await updateGameState('ended');
  }, [updateGameState]);

  const cancelGame = useCallback(async () => {
    if (!gameRef) return;
    setIsLoading(true);
    try {
      await deleteDoc(gameRef);
    } finally {
      setIsLoading(false);
    }
  }, [gameRef]);

  return {
    updateGameState,
    goToSlide,
    nextSlide,
    previousSlide,
    startPresentation,
    endPresentation,
    cancelGame,
    isLoading,
  };
}

/**
 * Hook to create a new presentation game
 */
export function useCreatePresentationGame() {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createGame = useCallback(
    async (presentationId: string, hostId: string): Promise<string> => {
      if (!firestore) throw new Error('Firestore not initialized');

      setIsLoading(true);
      setError(null);

      try {
        const gamePin = generateGamePin();

        const gameData: Omit<PresentationGame, 'id'> = {
          hostId,
          gamePin,
          activityType: 'presentation',
          presentationId,
          state: 'lobby',
          currentSlideIndex: 0,
          createdAt: new Date(),
        };

        const docRef = await addDoc(collection(firestore, 'games'), {
          ...gameData,
          createdAt: serverTimestamp(),
        });

        return docRef.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create game');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [firestore]
  );

  return { createGame, isLoading, error };
}
