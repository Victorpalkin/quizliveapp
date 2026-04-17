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
import type { PresentationGame, PresentationSlide, SlideElement } from '@/lib/types';

type PlayerState = 'joining' | 'lobby' | 'active' | 'ended';

interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
}

export interface QuizResult {
  isCorrect: boolean;
  points: number;
  wasTimeout: boolean;
}

const INTERACTIVE_TYPES = ['quiz', 'poll', 'thoughts', 'rating', 'evaluation', 'agentic-designer'];
const SESSION_KEY = 'zivo-pres-player-session';

function toDate(val: unknown): Date | undefined {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return undefined;
}

export function usePlayerStateMachine(gamePin: string, playerId: string) {
  const firestore = useFirestore();
  const [state, setState] = useState<PlayerState>('joining');
  const [game, setGame] = useState<PresentationGame | null>(null);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const respondedRef = useRef<Set<string>>(new Set());
  const quizResultsRef = useRef<Map<string, QuizResult>>(new Map());
  const [quizResultsVersion, setQuizResultsVersion] = useState(0);

  // Restore session from localStorage (only if playerId matches current auth identity)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`${SESSION_KEY}-${gamePin}`);
      if (stored) {
        const parsed = JSON.parse(stored) as PlayerSession;
        if (parsed.playerId === playerId) {
          setSession(parsed);
          setState('lobby');
        } else {
          sessionStorage.removeItem(`${SESSION_KEY}-${gamePin}`);
        }
      }
    } catch {
      // No session to restore
    }
    setLoading(false);
  }, [gamePin, playerId]);

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
        timerStartedAt: toDate(data.timerStartedAt),
        timerElementId: data.timerElementId ?? undefined,
      });

      // Load sanitized slides from game document (no correct answers)
      if (data.sanitizedSlides) {
        setSlides(data.sanitizedSlides);
      }
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
    setState(game.state === 'active' ? 'active' : 'lobby');
  }, [firestore, game, gamePin, playerId]);

  // Get current slide interactive element
  const currentSlide = game ? slides[game.currentSlideIndex] : null;
  const interactiveElement: SlideElement | null = currentSlide?.elements.find(
    (el) => INTERACTIVE_TYPES.includes(el.type)
  ) || null;

  // Detect results elements on current slide
  const RESULTS_TYPES = ['quiz-results', 'poll-results', 'thoughts-results', 'rating-results', 'evaluation-results'];
  const resultsElement: SlideElement | null = currentSlide?.elements.find(
    (el) => RESULTS_TYPES.includes(el.type)
  ) || null;
  const leaderboardElement: SlideElement | null = currentSlide?.elements.find(
    (el) => el.type === 'leaderboard'
  ) || null;
  const qaElement: SlideElement | null = currentSlide?.elements.find(
    (el) => el.type === 'qa'
  ) || null;

  // Track responded elements
  const markResponded = useCallback((elementId: string) => {
    respondedRef.current.add(elementId);
  }, []);

  const hasResponded = useCallback((elementId: string) => {
    return respondedRef.current.has(elementId);
  }, []);

  // Store quiz result for an element
  const storeQuizResult = useCallback((elementId: string, result: QuizResult) => {
    quizResultsRef.current.set(elementId, result);
    setQuizResultsVersion((v) => v + 1);
  }, []);

  // Handle timeout (player didn't answer in time)
  const handleTimeout = useCallback((elementId: string) => {
    if (!respondedRef.current.has(elementId)) {
      respondedRef.current.add(elementId);
      quizResultsRef.current.set(elementId, {
        isCorrect: false,
        points: 0,
        wasTimeout: true,
      });
      setQuizResultsVersion((v) => v + 1);
    }
  }, []);

  // Get quiz result for an element
  const getQuizResult = useCallback((elementId: string): QuizResult | null => {
    return quizResultsRef.current.get(elementId) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizResultsVersion]);

  return {
    state,
    game,
    session,
    currentSlide,
    interactiveElement,
    resultsElement,
    leaderboardElement,
    qaElement,
    slides,
    playerScore,
    playerStreak,
    loading,
    joinGame,
    markResponded,
    hasResponded,
    storeQuizResult,
    handleTimeout,
    getQuizResult,
  };
}
