'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface ElementStats {
  elementId: string;
  elementType: string;
  totalResponses: number;
  averageTimeRemaining?: number;
  correctPercentage?: number;
  averageRating?: number;
  distribution?: number[];
}

interface PlayerEngagement {
  playerId: string;
  playerName: string;
  score: number;
  responsesSubmitted: number;
  averageResponseTime: number;
  maxStreak: number;
  reactionsCount: number;
  questionsAsked: number;
}

export interface PresentationAnalytics {
  totalPlayers: number;
  totalResponses: number;
  totalReactions: number;
  totalQuestions: number;
  averageScore: number;
  elementStats: ElementStats[];
  playerEngagement: PlayerEngagement[];
  completedAt?: Date;
}

export function useAnalytics(gameId: string) {
  const firestore = useFirestore();
  const [analytics, setAnalytics] = useState<PresentationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !gameId) {
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, 'games', gameId, 'aggregates', 'analytics');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAnalytics({
          totalPlayers: data.totalPlayers ?? 0,
          totalResponses: data.totalResponses ?? 0,
          totalReactions: data.totalReactions ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          averageScore: data.averageScore ?? 0,
          elementStats: data.elementStats || [],
          playerEngagement: data.playerEngagement || [],
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : undefined,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, gameId]);

  return { analytics, loading };
}
