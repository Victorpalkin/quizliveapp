import * as admin from 'firebase-admin';

/**
 * Request interface for submitAnswer Cloud Function
 */
export interface SubmitAnswerRequest {
  gameId: string;
  playerId: string;
  questionIndex: number;
  timeRemaining: number; // Time remaining when answer was submitted

  // Answer data (one will be used based on question type)
  answerIndex?: number;        // For single-choice, poll-single
  answerIndices?: number[];    // For multi-choice questions, poll-multiple
  sliderValue?: number;        // For slider questions
  textAnswer?: string;         // For free-response questions

  // Question metadata (passed from client to avoid quiz fetch)
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple';
  questionTimeLimit?: number;

  // Type-specific metadata
  correctAnswerIndex?: number;       // For single-choice
  correctAnswerIndices?: number[];   // For multiple-choice
  correctValue?: number;             // For slider
  minValue?: number;                 // For slider
  maxValue?: number;                 // For slider
  acceptableError?: number;          // For slider - absolute error threshold
  correctAnswer?: string;            // For free-response
  alternativeAnswers?: string[];     // For free-response - alternative accepted answers
  caseSensitive?: boolean;           // For free-response - default false
  allowTypos?: boolean;              // For free-response - default true
}

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
}

/**
 * Player answer stored in Firestore
 */
export interface PlayerAnswer {
  questionIndex: number;
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple';
  timestamp: admin.firestore.FieldValue;
  answerIndex?: number;
  answerIndices?: number[];
  sliderValue?: number;
  textAnswer?: string;
  points: number;
  isCorrect: boolean;
  wasTimeout: boolean;
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
}

/**
 * Request interface for createHostAccount Cloud Function
 */
export interface CreateHostAccountRequest {
  email: string;
  password: string;
  name: string;
  jobRole: string;
  team: string;
}

/**
 * Result returned from submitAnswer function
 *
 * Note: rank and totalPlayers are now computed in computeQuestionResults
 * and read from the leaderboard aggregate by the client.
 * This reduces submitAnswer latency from ~400-700ms to ~100-150ms.
 */
export interface SubmitAnswerResult {
  success: boolean;
  isCorrect: boolean;
  isPartiallyCorrect: boolean;
  points: number;
  newScore: number;
  currentStreak: number;
}

/**
 * Result returned from createHostAccount function
 * Note: verificationLink is intentionally NOT returned for security reasons
 */
export interface CreateHostAccountResult {
  success: boolean;
  userId: string;
  message: string;
}

/**
 * Leaderboard entry for top players aggregate
 */
export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  currentStreak: number;
  lastQuestionPoints: number;
}

/**
 * Player rank info stored in leaderboard aggregate
 */
export interface PlayerRankInfo {
  rank: number;
  totalPlayers: number;
}

/**
 * Game leaderboard aggregate document
 * Stored at: games/{gameId}/aggregates/leaderboard
 */
export interface GameLeaderboard {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  totalAnswered: number;
  answerCounts: number[];  // Per-answer distribution for current question
  playerRanks: Record<string, PlayerRankInfo>;  // Map of playerId -> rank info
  lastUpdated: admin.firestore.FieldValue | null;
}
