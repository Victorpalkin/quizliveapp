import { Timestamp } from 'firebase/firestore';

import type { Question, CrowdsourceState } from './quiz';

export interface PlayerAnswer {
    questionIndex: number;
    questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple' | 'poll-free-text';
    timestamp: Timestamp;

    // Answer data (type-specific, one will be populated)
    answerIndex?: number;           // For single-choice, poll-single
    answerIndices?: number[];       // For multiple-choice, poll-multiple
    sliderValue?: number;           // For slider
    textAnswer?: string;            // For free-response, poll-free-text

    // Scoring data
    points: number;
    isCorrect: boolean;
    wasTimeout: boolean;
}

export interface Player {
    id: string;
    name: string;
    score: number;
    answers: PlayerAnswer[];
    currentStreak: number;
    maxStreak?: number;
}

// Activity types for the Activity system
export type ActivityType = 'quiz' | 'thoughts-gathering' | 'evaluation' | 'presentation' | 'poll';

// Quiz game states (existing)
export type QuizGameState = 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';

// Thoughts Gathering game states
export type ThoughtsGatheringGameState = 'lobby' | 'collecting' | 'processing' | 'display' | 'ended';

// Evaluation game states
export type EvaluationGameState = 'collecting' | 'rating' | 'analyzing' | 'results' | 'ended';

// Poll game states
export type PollGameState = 'lobby' | 'question' | 'results' | 'ended';

export interface Game {
    id: string;
    quizId: string;
    hostId: string;
    state: QuizGameState | ThoughtsGatheringGameState | EvaluationGameState | PollGameState;
    currentQuestionIndex: number;
    gamePin: string;
    questionStartTime?: Timestamp; // Firestore server timestamp when current question started (for timer sync)
    crowdsourceState?: CrowdsourceState;  // Runtime state for crowdsourced questions
    questions?: Question[];  // Override questions (used when crowdsourced questions are integrated)
    createdAt?: Date;  // When the game was created

    // Activity system fields (optional for backward compatibility)
    activityType?: ActivityType;  // Default: 'quiz' for existing games
    activityId?: string;          // Reference to activity document (for non-quiz activities)

    // Thoughts Gathering specific
    submissionsOpen?: boolean;    // Whether submissions are currently accepted

    // Evaluation specific
    itemSubmissionsOpen?: boolean;  // Whether item submissions are accepted during collecting phase

    // Presentation specific
    presentationId?: string;  // Reference to presentation document (for presentation games)
}

// Cloud Function response interface for submitAnswer
// Note: rank, totalPlayers, and currentStreak removed - now computed in computeQuestionResults
// and read from the leaderboard aggregate by the client
export interface SubmitAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  isPartiallyCorrect?: boolean; // Only for multiple-choice questions
  points: number;
  newScore: number;
}

// Leaderboard types for host-side performance optimization
// Host subscribes to single aggregate doc instead of N player documents
export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  currentStreak: number;
  lastQuestionPoints: number;
}

// Player rank info stored in leaderboard aggregate
export interface PlayerRankInfo {
  rank: number;
  totalPlayers: number;
}

export interface GameLeaderboard {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  totalAnswered: number;
  answerCounts: number[];  // Per-answer distribution for current question (set by computeQuestionResults)
  liveAnswerCounts?: Record<string, number>;  // Real-time answer counts during question (atomic increments)
  playerRanks: Record<string, PlayerRankInfo>;  // Map of playerId -> rank info
  playerStreaks: Record<string, number>;  // Map of playerId -> streak count
  lastUpdated: Timestamp | null;
}
