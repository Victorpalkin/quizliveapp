import * as admin from 'firebase-admin';

/**
 * Request interface for submitAnswer Cloud Function
 * Note: Correct answer data is now fetched server-side from the answer key document
 * to prevent players from seeing correct answers in browser dev tools.
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

  // Question metadata
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple';
  questionTimeLimit?: number;

  // Presentation context (optional)
  slideId?: string;  // For presentation slides - identifies which slide this answer is for
}

/**
 * Answer key entry stored in games/{gameId}/aggregates/answerKey
 * Contains correct answers for server-side scoring.
 * Players cannot read this document (blocked by Firestore rules).
 */
export interface AnswerKeyEntry {
  type: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple' | 'slide';
  timeLimit: number;

  // Type-specific answer data
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
 * Answer key document stored in games/{gameId}/aggregates/answerKey
 */
export interface AnswerKey {
  questions: AnswerKeyEntry[];
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
  slideId?: string;  // For presentation slides
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
 * Note: rank, totalPlayers, and currentStreak are now computed in computeQuestionResults
 * and read from the leaderboard aggregate by the client.
 * This reduces submitAnswer latency from ~400-700ms to ~100-150ms.
 */
export interface SubmitAnswerResult {
  success: boolean;
  isCorrect: boolean;
  isPartiallyCorrect: boolean;
  points: number;
  newScore: number;
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
  answerCounts: number[];  // Per-answer distribution for current question (set by computeQuestionResults)
  liveAnswerCounts?: Record<string, number>;  // Real-time answer counts during question (atomic increments)
  playerRanks: Record<string, PlayerRankInfo>;  // Map of playerId -> rank info
  playerStreaks: Record<string, number>;  // Map of playerId -> streak count
  lastUpdated: admin.firestore.FieldValue | null;
}

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
  computedAt: admin.firestore.FieldValue;

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

/**
 * Request interface for computePollAnalytics Cloud Function
 */
export interface ComputePollAnalyticsRequest {
  gameId: string;
}

/**
 * Result returned from computePollAnalytics function
 */
export interface ComputePollAnalyticsResult {
  success: boolean;
  message: string;
  analytics?: {
    totalParticipants: number;
    totalQuestions: number;
  };
}

// ==========================================
// Ranking Activity Types
// ==========================================

/**
 * Metric configuration for ranking activity
 */
export interface RankingMetric {
  id: string;
  name: string;
  description?: string;
  scaleType: 'stars' | 'numeric' | 'labels';
  scaleMin: number;
  scaleMax: number;
  scaleLabels?: string[];
  weight: number;
  lowerIsBetter: boolean;
}

/**
 * A predefined item template stored in activity config
 */
export interface PredefinedItem {
  id: string;
  text: string;
  description?: string;
}

/**
 * Ranking activity configuration
 */
export interface RankingConfig {
  metrics: RankingMetric[];
  predefinedItems: PredefinedItem[];
  allowParticipantItems: boolean;
  maxItemsPerParticipant: number;
  requireApproval: boolean;
  showItemSubmitter: boolean;
}

/**
 * Ranking activity document
 */
export interface RankingActivity {
  id: string;
  type: 'evaluation';
  title: string;
  description?: string;
  hostId: string;
  config: RankingConfig;
}

/**
 * Ranking item to be rated
 */
export interface RankingItem {
  id: string;
  text: string;
  description?: string;
  submittedBy?: string;
  submittedByPlayerId?: string;
  isHostItem: boolean;
  approved: boolean;
  order: number;
}

/**
 * Player's ratings for items
 */
export interface PlayerRatings {
  playerId: string;
  playerName: string;
  ratings: {
    [itemId: string]: {
      [metricId: string]: number;
    };
  };
  isComplete: boolean;
}

/**
 * Metric score details for an item
 */
export interface MetricScoreDetails {
  rawAverage: number;
  normalizedAverage: number;
  median: number;
  stdDev: number;
  distribution: number[];
  responseCount: number;
}

/**
 * Individual item result with scores
 */
export interface RankingItemResult {
  itemId: string;
  itemText: string;
  itemDescription?: string;
  overallScore: number;
  rank: number;
  metricScores: {
    [metricId: string]: MetricScoreDetails;
  };
  consensusLevel: 'high' | 'medium' | 'low';
}

/**
 * Complete ranking results document
 * Stored at: games/{gameId}/aggregates/rankings
 */
export interface RankingResults {
  items: RankingItemResult[];
  totalParticipants: number;
  participantsWhoRated: number;
  processedAt: admin.firestore.FieldValue;
}

/**
 * Request interface for computeRankingResults Cloud Function
 */
export interface ComputeRankingResultsRequest {
  gameId: string;
}

/**
 * Result returned from computeRankingResults function
 */
export interface ComputeRankingResultsResult {
  success: boolean;
  message: string;
  results?: {
    totalItems: number;
    totalParticipants: number;
  };
}

// ==========================================
// Poll Answer Submission Types
// ==========================================

/**
 * Poll question type union
 * Note: These don't require scoring - responses are just recorded
 */
export type PollQuestionType = 'poll-single' | 'poll-multiple' | 'poll-free-text';

/**
 * Request interface for submitPollAnswer Cloud Function
 * Separate from submitAnswer to keep quiz answer submission fast
 */
export interface SubmitPollAnswerRequest {
  gameId: string;
  playerId: string;
  questionIndex: number;
  questionType: PollQuestionType;

  // Answer data (one will be used based on question type)
  answerIndex?: number;        // For poll-single
  answerIndices?: number[];    // For poll-multiple
  textAnswer?: string;         // For poll-free-text
}

/**
 * Result returned from submitPollAnswer function
 */
export interface SubmitPollAnswerResult {
  success: boolean;
}

/**
 * Poll player answer stored in Firestore
 */
export interface PollPlayerAnswer {
  questionIndex: number;
  questionType: PollQuestionType;
  timestamp: admin.firestore.FieldValue;
  answerIndex?: number;
  answerIndices?: number[];
  textAnswer?: string;
}

// ==========================================
// Presentation Analytics Types
// ==========================================

/**
 * Slide type enum (subset from client types)
 */
export type PresentationSlideType =
  | 'content'
  | 'quiz'
  | 'poll'
  | 'quiz-results'
  | 'poll-results'
  | 'thoughts-collect'
  | 'thoughts-results'
  | 'rating-describe'
  | 'rating-input'
  | 'rating-results'
  | 'rating-summary'
  | 'leaderboard';

/**
 * Pre-computed analytics for a completed presentation.
 * Stored at: games/{gameId}/aggregates/analytics
 */
export interface PresentationAnalytics {
  gameId: string;
  presentationId: string;
  presentationTitle: string;
  totalSlides: number;
  interactiveSlides: number;
  totalPlayers: number;
  computedAt: admin.firestore.FieldValue;

  slideStats: PresentationSlideStats[];
  playerEngagement: PlayerEngagementStats[];
  summary: PresentationAnalyticsSummary;
  slideTypeBreakdown: SlideTypeStats[];
}

export interface PresentationSlideStats {
  slideIndex: number;
  slideId: string;
  slideType: PresentationSlideType;
  title?: string;

  totalResponded: number;
  responseRate: number;

  // For quiz slides
  correctCount?: number;
  correctRate?: number;
  avgPoints?: number;
  answerDistribution?: { label: string; count: number; isCorrect: boolean }[];

  // For poll slides
  pollDistribution?: { label: string; count: number; percentage: number }[];

  // For rating slides
  avgRating?: number;
  ratingDistribution?: number[];

  // For thoughts slides
  submissionCount?: number;
  topicsCount?: number;
}

export interface PlayerEngagementStats {
  playerId: string;
  playerName: string;
  engagementScore: number;
  responsesSubmitted: number;
  totalInteractiveSlides: number;
  responseRate: number;

  totalScore?: number;
  correctAnswers?: number;
  avgResponseTime?: number;
}

export interface PresentationAnalyticsSummary {
  avgResponseRate: number;
  avgEngagementScore: number;
  mostEngagedSlide: { index: number; responseRate: number } | null;
  leastEngagedSlide: { index: number; responseRate: number } | null;
  avgQuizAccuracy?: number;
  avgRating?: number;
}

export interface SlideTypeStats {
  type: PresentationSlideType;
  count: number;
  avgResponseRate: number;
  label: string;
}

/**
 * Request interface for computePresentationAnalytics Cloud Function
 */
export interface ComputePresentationAnalyticsRequest {
  gameId: string;
}

/**
 * Result returned from computePresentationAnalytics function
 */
export interface ComputePresentationAnalyticsResult {
  success: boolean;
  message: string;
  analytics?: {
    totalPlayers: number;
    totalSlides: number;
    interactiveSlides: number;
  };
}
