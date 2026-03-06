import * as admin from 'firebase-admin';

/**
 * Pre-computed analytics for a completed game.
 * Stored at: games/{gameId}/aggregates/analytics
 */
export interface GameAnalytics {
  gameId: string;
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  totalPlayers: number;
  computedAt: admin.firestore.FieldValue;

  questionStats: QuestionStats[];
  positionHistory: PositionHistoryEntry[];
  scoreDistribution: ScoreBin[];
  fullLeaderboard: LeaderboardWithStats[];

  summary: GameAnalyticsSummary;
  crowdsourceStats?: CrowdsourceAnalytics;
}

export interface GameAnalyticsSummary {
  hardestQuestion: { index: number; correctRate: number } | null;
  easiestQuestion: { index: number; correctRate: number } | null;
  avgScore: number;
  avgAccuracy: number;
  avgTimeoutRate: number;
}

export interface CrowdsourceAnalytics {
  totalSubmissions: number;
  submissionsUsed: number;
  topContributors: { playerName: string; submissionCount: number; usedCount: number }[];
}

export interface QuestionStats {
  questionIndex: number;
  questionText: string;
  questionType: string;
  imageUrl?: string;
  submittedBy?: string;

  answerDistribution?: { label: string; count: number; isCorrect: boolean }[];
  sliderDistribution?: {
    correctValue: number;
    minValue: number;
    maxValue: number;
    unit?: string;
    playerValues: number[];
  };
  freeResponseDistribution?: { text: string; count: number; isCorrect: boolean }[];

  totalAnswered: number;
  totalTimeout: number;
  timeoutRate: number;
  correctCount: number;
  correctRate: number;
  avgResponseTime: number;
  avgPoints: number;
}

export interface PositionHistoryEntry {
  playerId: string;
  playerName: string;
  positions: number[];
  finalScore: number;
}

export interface ScoreBin {
  minScore: number;
  maxScore: number;
  count: number;
}

export interface LeaderboardWithStats {
  playerId: string;
  playerName: string;
  rank: number;
  finalScore: number;
  correctAnswers: number;
  totalAnswered: number;
  timeouts: number;
  accuracy: number;
  avgResponseTime: number;
}

/**
 * Request interface for computeGameAnalytics Cloud Function
 */
export interface ComputeGameAnalyticsRequest {
  gameId: string;
}

/**
 * Result returned from computeGameAnalytics function
 */
export interface ComputeGameAnalyticsResult {
  success: boolean;
  message: string;
  analytics?: {
    totalPlayers: number;
    totalQuestions: number;
  };
}
