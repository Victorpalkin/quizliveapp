import * as admin from 'firebase-admin';

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
  answerCounts: number[];  // Per-answer distribution for current question (set by computeQuestionResults)
  liveAnswerCounts?: Record<string, number>;  // Real-time answer counts during question (atomic increments)
  playerRanks: Record<string, PlayerRankInfo>;  // Map of playerId -> rank info
  playerStreaks: Record<string, number>;  // Map of playerId -> streak count
  lastUpdated: admin.firestore.FieldValue | null;
}
