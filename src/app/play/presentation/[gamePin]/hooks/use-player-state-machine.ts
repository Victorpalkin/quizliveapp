'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc,
  collection,
  query,
  where,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { nanoid } from 'nanoid';
import type { PresentationGame, PresentationSlide, SlideElement } from '@/lib/types';

type PlayerState = 'joining' | 'lobby' | 'active' | 'ended';

interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
}

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating'];
const SESSION_KEY = 'zivo-pres-player-session';

export function usePlayerStateMachine(gamePin: string) {
  const firestore = useFirestore();
  const [state, setState] = useState<PlayerState>('joining');
  const [game, setGame] = useState<PresentationGame | null>(null);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const respondedRef = useRef<Set<string>>(new Set());

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`${SESSION_KEY}-${gamePin}`);
      if (stored) {
        const parsed = JSON.parse(stored) as PlayerSession;
        setSession(parsed);
        setState('lobby');
      }
    } catch {
      // No session to restore
    }
    setLoading(false);
  }, [gamePin]);

  // Find game by PIN
  useEffect(() => {
    if (!firestore) return;

    const q = query(
      collection(firestore, 'games'),
      where('gamePin', '==', gamePin),
      where('activityType', '==', 'presentation')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setGame(null);
        return;
      }
      const gameDoc = snapshot.docs[0];
      const data = gameDoc.data();
      setGame({
        id: gameDoc.id,
        hostId: data.hostId,
        gamePin: data.gamePin,
        activityType: 'presentation',
        presentationId: data.presentationId,
        state: data.state,
        currentSlideIndex: data.currentSlideIndex ?? 0,
        settings: data.settings,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      });
    });

    return () => unsubscribe();
  }, [firestore, gamePin]);

  // Update player state based on game state
  useEffect(() => {
    if (!game) return;

    if (game.state === 'ended') {
      setState('ended');
    } else if (game.state === 'active' && session) {
      setState('active');
    } else if (session) {
      setState('lobby');
    }
  }, [game?.state, session]);

  // Load presentation slides
  useEffect(() => {
    if (!firestore || !game?.presentationId) return;

    const unsubscribe = onSnapshot(
      doc(firestore, 'presentations', game.presentationId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSlides(data.slides || []);
        }
      }
    );

    return () => unsubscribe();
  }, [firestore, game?.presentationId]);

  // Subscribe to own player doc for score/streak
  useEffect(() => {
    if (!firestore || !session?.gameId || !session?.playerId) return;

    const unsubscribe = onSnapshot(
      doc(firestore, 'games', session.gameId, 'players', session.playerId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPlayerScore(data.score ?? 0);
          setPlayerStreak(data.currentStreak ?? 0);
        }
      }
    );

    return () => unsubscribe();
  }, [firestore, session?.gameId, session?.playerId]);

  // Join game
  const joinGame = useCallback(async (name: string) => {
    if (!firestore || !game) throw new Error('Cannot join game');

    const playerId = nanoid();
    await setDoc(
      doc(firestore, 'games', game.id, 'players', playerId),
      {
        id: playerId,
        name,
        score: 0,
        answers: [],
        currentStreak: 0,
        maxStreak: 0,
        joinedAt: serverTimestamp(),
      }
    );

    const newSession: PlayerSession = { playerId, playerName: name, gameId: game.id };
    sessionStorage.setItem(`${SESSION_KEY}-${gamePin}`, JSON.stringify(newSession));
    setSession(newSession);
    setState('lobby');
  }, [firestore, game, gamePin]);

  // Get current slide interactive element
  const currentSlide = game ? slides[game.currentSlideIndex] : null;
  const interactiveElement: SlideElement | null = currentSlide?.elements.find(
    (el) => INTERACTIVE_TYPES.includes(el.type)
  ) || null;

  // Track responded elements
  const markResponded = useCallback((elementId: string) => {
    respondedRef.current.add(elementId);
  }, []);

  const hasResponded = useCallback((elementId: string) => {
    return respondedRef.current.has(elementId);
  }, []);

  return {
    state,
    game,
    session,
    currentSlide,
    interactiveElement,
    slides,
    playerScore,
    playerStreak,
    loading,
    joinGame,
    markResponded,
    hasResponded,
  };
}
