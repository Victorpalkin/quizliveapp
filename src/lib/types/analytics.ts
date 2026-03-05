import { Timestamp } from 'firebase/firestore';

// ==========================================
// Game Analytics Types
// ==========================================

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
  computedAt: Timestamp;

  questionStats: QuestionStats[];
  positionHistory: PositionHistoryEntry[];  // Top 20 players' rank after each question
  scoreDistribution: ScoreBin[];            // Histogram bins
  fullLeaderboard: LeaderboardWithStats[];  // All players with accuracy stats

  summary: GameAnalyticsSummary;

  // Crowdsource analytics (if game had crowdsourcing enabled)
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
  submittedBy?: string;  // Player name for crowdsourced questions

  // Answer distribution (for choice-based questions)
  answerDistribution?: { label: string; count: number; isCorrect: boolean }[];

  // Slider distribution (for slider questions)
  sliderDistribution?: {
    correctValue: number;
    minValue: number;
    maxValue: number;
    unit?: string;
    playerValues: number[];  // All submitted values
  };

  // Free response distribution (for text questions)
  freeResponseDistribution?: { text: string; count: number; isCorrect: boolean }[];

  // Metrics
  totalAnswered: number;
  totalTimeout: number;
  timeoutRate: number;      // Percentage 0-100
  correctCount: number;
  correctRate: number;      // Percentage 0-100 (0 for polls/slides)
  avgResponseTime: number;  // In seconds
  avgPoints: number;        // Average points awarded
}

export interface PositionHistoryEntry {
  playerId: string;
  playerName: string;
  positions: number[];  // Rank after each question (index = questionIndex)
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
  accuracy: number;         // Percentage 0-100
  avgResponseTime: number;  // In seconds
}

// ==========================================
// Poll Analytics Types
// ==========================================

/**
 * Pre-computed analytics for a completed poll.
 * Stored at: games/{gameId}/aggregates/poll-analytics
 */
export interface PollAnalytics {
  gameId: string;
  activityId: string;
  pollTitle: string;
  totalQuestions: number;
  totalParticipants: number;
  computedAt: Timestamp;

  questionStats: PollQuestionStats[];
  summary: PollAnalyticsSummary;
}

export interface PollAnalyticsSummary {
  avgResponseRate: number;      // Average percentage of participants who answered each question
  totalResponses: number;       // Sum of all responses across all questions
}

export interface PollQuestionStats {
  questionIndex: number;
  questionText: string;
  questionType: 'poll-single' | 'poll-multiple' | 'poll-free-text';

  totalResponded: number;
  responseRate: number;         // Percentage of participants who answered

  // For single/multiple choice questions
  answerDistribution?: {
    label: string;
    count: number;
    percentage: number;
  }[];

  // For free text questions (grouped responses)
  textGroups?: {
    text: string;
    count: number;
    percentage: number;
  }[];
}
