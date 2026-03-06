import type { PlayerAnswer } from './submission';

/**
 * Game document interface from Firestore
 */
export interface Game {
  quizId: string;
  hostId: string;
  state: string;
  currentQuestionIndex: number;
  gamePin: string;
  questionStartTime?: {
    toMillis: () => number;
  };
  activityId?: string;
  activityType?: string;
}

/**
 * Player document interface from Firestore
 */
export interface Player {
  id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
  currentStreak?: number;
  lastStreakQuestionIndex?: number;  // For idempotent streak calculation
}
