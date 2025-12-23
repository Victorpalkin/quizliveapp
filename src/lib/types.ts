
import { Timestamp } from 'firebase/firestore';

export interface Answer {
  text: string;
  isCorrect?: boolean;
}

// Base question properties shared by all types
interface BaseQuestion {
  id?: string;
  text: string;
  timeLimit?: number; // in seconds
  imageUrl?: string;
  submittedBy?: string; // Player name for crowdsourced questions
  showLiveResults?: boolean; // Show live answer distribution during question (choice-based questions only)
}

// Single choice question - exactly one correct answer
export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice';
  answers: Answer[];
  correctAnswerIndex: number; // Single index for the one correct answer
}

// Multiple choice question - multiple correct answers with proportional scoring
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  answers: Answer[];
  correctAnswerIndices: number[]; // Multiple indices for correct answers (removed in sanitized version)
  showAnswerCount?: boolean; // Default: true, show how many answers to select
  expectedAnswerCount?: number; // Always present in sanitized version (replaces correctAnswerIndices.length)
}

// Slider question
export interface SliderQuestion extends BaseQuestion {
  type: 'slider';
  minValue: number;
  maxValue: number;
  correctValue: number;
  step?: number;  // Decimal precision (e.g., 0.1)
  unit?: string;  // Optional display unit (e.g., "kg", "%", "°C")
  acceptableError?: number;  // Absolute error margin for correct answers (default: 5% of range)
}

// Slide question - informational only, no answer required
export interface SlideQuestion extends BaseQuestion {
  type: 'slide';
  description?: string;
}

// Free response question - player types in their answer
export interface FreeResponseQuestion extends BaseQuestion {
  type: 'free-response';
  correctAnswer: string;            // The expected correct answer
  alternativeAnswers?: string[];    // Optional alternative accepted answers
  caseSensitive?: boolean;          // Default: false (case-insensitive)
  allowTypos?: boolean;             // Default: true (fuzzy matching enabled)
}

// Poll question - single choice, no scoring
export interface PollSingleQuestion extends BaseQuestion {
  type: 'poll-single';
  answers: Answer[];
}

// Poll question - multiple choice, no scoring
export interface PollMultipleQuestion extends BaseQuestion {
  type: 'poll-multiple';
  answers: Answer[];
}

// Discriminated union of all question types
export type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion;

// Crowdsource settings configured during quiz creation/edit
export interface CrowdsourceSettings {
  enabled: boolean;                  // Default: false
  topicPrompt: string;               // e.g., "European geography"
  questionsNeeded: number;           // How many questions to select (default: 10)
  maxSubmissionsPerPlayer: number;   // Default: 3
  integrationMode: 'append' | 'replace' | 'prepend';  // Default: 'append'
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  hostId: string;
  crowdsource?: CrowdsourceSettings;  // Optional crowdsource configuration
  createdAt?: Date;   // Optional for backward compatibility with existing quizzes
  updatedAt?: Date;   // Optional for backward compatibility
}

export interface QuizShare {
  id: string;
  quizId: string;
  quizTitle: string;
  sharedWith: string; // email
  sharedBy: string; // userId
  sharedByEmail: string;
  createdAt: Date;
}

export interface HostProfile {
  id: string;              // Firebase Auth UID
  email: string;           // @google.com email
  name: string;            // Display name
  jobRole: string;         // Job role/title
  team: string;            // Team name
  emailVerified: boolean;  // Email verification status
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerAnswer {
    questionIndex: number;
    questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'free-response' | 'poll-single' | 'poll-multiple';
    timestamp: Timestamp;

    // Answer data (type-specific, one will be populated)
    answerIndex?: number;           // For single-choice, poll-single
    answerIndices?: number[];       // For multiple-choice, poll-multiple
    sliderValue?: number;           // For slider
    textAnswer?: string;            // For free-response

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
}

// Runtime state for crowdsourced questions during lobby
export interface CrowdsourceState {
  submissionsLocked: boolean;    // True when AI evaluation starts - no new submissions
  evaluationComplete: boolean;   // Has AI evaluated yet
  selectedCount: number;         // How many questions selected
}

// Activity types for the Activity system
export type ActivityType = 'quiz' | 'thoughts-gathering' | 'evaluation' | 'presentation';

// Quiz game states (existing)
export type QuizGameState = 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';

// Thoughts Gathering game states
export type ThoughtsGatheringGameState = 'lobby' | 'collecting' | 'processing' | 'display' | 'ended';

// Evaluation game states
export type EvaluationGameState = 'collecting' | 'rating' | 'analyzing' | 'results' | 'ended';

export interface Game {
    id: string;
    quizId: string;
    hostId: string;
    state: QuizGameState | ThoughtsGatheringGameState | EvaluationGameState;
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

// Question submission from a player during lobby (crowdsourced questions)
export interface QuestionSubmission {
  id: string;
  playerId: string;
  playerName: string;
  submittedAt: Timestamp;
  expireAt: Timestamp;  // For Firestore TTL cleanup (24 hours from creation)

  // Question content (single-choice only for MVP)
  questionText: string;
  answers: string[];  // 4 answer options
  correctAnswerIndex: number;  // Stored but NOT shown to host

  // AI evaluation results (populated after evaluation)
  aiScore?: number;        // 0-100 quality score
  aiReasoning?: string;    // Why this score
  aiSelected?: boolean;    // Selected for quiz
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
// Thoughts Gathering Activity Types
// ==========================================

/**
 * Configuration for Thoughts Gathering activity
 */
export interface ThoughtsGatheringConfig {
  prompt: string;                    // e.g., "What topics interest you most?"
  maxSubmissionsPerPlayer: number;   // Default: 3
  allowMultipleRounds: boolean;      // Can host reopen for more submissions
}

/**
 * Thoughts Gathering activity stored in /activities/{activityId}
 */
export interface ThoughtsGatheringActivity {
  id: string;
  type: 'thoughts-gathering';
  title: string;
  description?: string;
  hostId: string;
  config: ThoughtsGatheringConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Player thought submission stored in /games/{gameId}/submissions/{submissionId}
 */
export interface ThoughtSubmission {
  id: string;
  playerId: string;
  playerName: string;
  rawText: string;              // Free-form text about thoughts/ideas
  submittedAt: Timestamp;
  extractedTopics?: string[];   // Filled by AI after processing
}

/**
 * A single topic group in the aggregated results
 */
export interface TopicEntry {
  topic: string;                // Short title for the group (e.g., "State Management Approaches")
  description: string;          // Summary paragraph explaining what the grouped thoughts have in common
  count: number;                // How many submissions are in this group
  variations: string[];         // Representative excerpts from grouped submissions
  submissionIds: string[];      // Which submissions are in this group
}

/**
 * Aggregated topic cloud result stored in /games/{gameId}/aggregates/topics
 */
export interface TopicCloudResult {
  topics: TopicEntry[];
  totalSubmissions: number;
  processedAt: Timestamp;
}

// ==========================================
// Evaluation Activity Types
// ==========================================

/**
 * A metric that items are scored on
 */
export interface EvaluationMetric {
  id: string;
  name: string;                    // e.g., "Impact", "Effort", "Complexity"
  description?: string;            // Help text for participants
  scaleType: 'stars' | 'numeric' | 'labels';
  scaleMin: number;                // e.g., 1
  scaleMax: number;                // e.g., 5 or 10
  scaleLabels?: string[];          // For 'labels' type: ["Low", "Medium", "High"]
  weight: number;                  // Weight for aggregate calculation (default: 1)
  lowerIsBetter: boolean;          // true for metrics like "Complexity", "Effort", "Risk"
}

/**
 * Configuration for Evaluation activity
 */
/**
 * A predefined item template stored in activity config
 */
export interface PredefinedItem {
  id: string;
  text: string;
  description?: string;
}

export interface EvaluationConfig {
  metrics: EvaluationMetric[];           // 1-5 metrics to rate on
  predefinedItems: PredefinedItem[];     // Items pre-created by host
  allowParticipantItems: boolean;        // Can participants suggest items?
  maxItemsPerParticipant: number;        // If allowed, how many? (default: 3)
  requireApproval: boolean;              // Must host approve participant items?
  showItemSubmitter: boolean;            // Show who submitted each item?
}

/**
 * Evaluation activity stored in /activities/{activityId}
 */
export interface EvaluationActivity {
  id: string;
  type: 'evaluation';
  title: string;
  description?: string;
  hostId: string;
  config: EvaluationConfig;
  createdAt: Date;
  updatedAt: Date;
  // Optional source tracking for evaluations created from other activities
  sourceActivityId?: string;  // ID of source thoughts gathering activity
  sourceGameId?: string;      // ID of source game (for topics/submissions)
  sourceType?: 'thoughts-gathering'; // Type of source activity
}

/**
 * An item to be evaluated, stored in /games/{gameId}/items/{itemId}
 */
export interface EvaluationItem {
  id: string;
  text: string;                     // Item name/description
  description?: string;             // Optional longer description
  submittedBy?: string;             // Player name (if participant-submitted)
  submittedByPlayerId?: string;     // Player ID
  isHostItem: boolean;              // true if added by host
  approved: boolean;                // For participant items requiring approval
  order: number;                    // Display order
  createdAt: Timestamp;
}

/**
 * A player's ratings for all items, stored in /games/{gameId}/ratings/{playerId}
 */
export interface PlayerRatings {
  playerId: string;
  playerName: string;
  ratings: {
    [itemId: string]: {
      [metricId: string]: number;   // The score given
    };
  };
  submittedAt: Timestamp;
  isComplete: boolean;              // Rated all items on all metrics
}

/**
 * Aggregated results for a single item
 */
export interface EvaluationItemResult {
  itemId: string;
  itemText: string;
  itemDescription?: string;         // Optional item description
  overallScore: number;             // Weighted average across metrics (0-1 normalized)
  rank: number;                     // Final position
  metricScores: {
    [metricId: string]: {
      rawAverage: number;           // Original scale average (e.g., 3.5 on 1-5 scale)
      normalizedAverage: number;    // 0-1 normalized (accounts for lowerIsBetter)
      median: number;
      stdDev: number;               // For consensus calculation
      distribution: number[];       // Count per score value
      responseCount: number;
    };
  };
  consensusLevel: 'high' | 'medium' | 'low';  // Based on stdDev
}

/**
 * Aggregated evaluation results stored in /games/{gameId}/aggregates/evaluations
 */
export interface EvaluationResults {
  items: EvaluationItemResult[];
  totalParticipants: number;
  participantsWhoRated: number;
  processedAt: Timestamp;
}

// ==========================================
// Presentation Mode Types
// ==========================================

/**
 * Slide types for hybrid presentations
 */
export type PresentationSlideType =
  | 'content'           // Imported slide (image) or text content
  | 'quiz'              // Quiz question (scored)
  | 'poll'              // Poll question (no scoring)
  | 'thoughts-collect'  // Thoughts gathering: collection prompt
  | 'thoughts-results'  // Thoughts gathering: word cloud display
  | 'rating-describe'   // Rating: item description (presenter explains)
  | 'rating-input'      // Rating: players submit their rating
  | 'rating-results';   // Rating: show aggregate results (optional)

/**
 * Rating metric configuration for rating slides
 */
export interface PresentationRatingMetric {
  type: 'stars' | 'numeric' | 'labels';
  min: number;
  max: number;
  labels?: string[];         // For 'labels' type
  question?: string;         // e.g., "How important is this?"
}

/**
 * Rating item configuration for rating-describe slides
 */
export interface PresentationRatingItem {
  title: string;             // Item name
  description?: string;      // Item description (shown to players)
  imageUrl?: string;         // Optional item image
}

/**
 * A single slide in a presentation
 */
export interface PresentationSlide {
  id: string;
  type: PresentationSlideType;
  order: number;

  // For 'content' type
  imageUrl?: string;           // Firebase Storage URL (imported or uploaded)
  googleSlideId?: string;      // Google Slides page ID (for re-import)
  title?: string;              // Optional text content
  description?: string;        // Optional text content

  // For 'quiz' and 'poll' types
  question?: Question;         // Reuse existing Question type

  // For 'thoughts-collect' type - word cloud collection
  thoughtsPrompt?: string;     // e.g., "What challenges do you face?"
  thoughtsMaxPerPlayer?: number; // Default: 3
  thoughtsTimeLimit?: number;  // Optional time limit in seconds

  // For 'rating-describe' type - item description
  ratingItem?: PresentationRatingItem;

  // For 'rating-input' type - rating input
  ratingInputSlideId?: string; // Links to the 'rating-describe' slide it belongs to
  ratingMetric?: PresentationRatingMetric;

  // For 'thoughts-results' and 'rating-results' types
  sourceSlideId?: string;      // Which collection/input slide this shows results for
}

/**
 * Presentation activity stored in /presentations/{presentationId}
 */
export interface Presentation {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  slides: PresentationSlide[];

  // Google Slides import tracking
  googleSlidesId?: string;     // Source presentation ID
  lastImportedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Presentation game states
 */
export type PresentationGameState =
  | 'lobby'      // Players joining
  | 'presenting' // Active presentation (content or activity slide)
  | 'ended';     // Presentation finished

/**
 * Extended Game type for presentations
 */
export interface PresentationGame {
  id: string;
  hostId: string;
  gamePin: string;
  activityType: 'presentation';
  presentationId: string;
  state: PresentationGameState;
  currentSlideIndex: number;
  createdAt?: Date;
}

/**
 * Player response for a presentation slide
 */
export interface PresentationSlideResponse {
  id: string;
  slideId: string;
  playerId: string;
  playerName: string;
  slideType: PresentationSlideType;
  submittedAt: Timestamp;

  // For quiz/poll slides
  answerIndex?: number;
  answerIndices?: number[];

  // For thoughts-collect slides
  thoughts?: string[];

  // For rating-input slides
  rating?: number;
}

// ==========================================
// Type Aliases for Backward Compatibility
// These can be removed after full migration
// ==========================================

/** @deprecated Use ThoughtsGatheringConfig instead */
export type InterestCloudConfig = ThoughtsGatheringConfig;
/** @deprecated Use ThoughtsGatheringActivity instead */
export type InterestCloudActivity = ThoughtsGatheringActivity;
/** @deprecated Use ThoughtSubmission instead */
export type InterestSubmission = ThoughtSubmission;
/** @deprecated Use ThoughtsGatheringGameState instead */
export type InterestCloudGameState = ThoughtsGatheringGameState;

/** @deprecated Use EvaluationMetric instead */
export type RankingMetric = EvaluationMetric;
/** @deprecated Use EvaluationConfig instead */
export type RankingConfig = EvaluationConfig;
/** @deprecated Use EvaluationActivity instead */
export type RankingActivity = EvaluationActivity;
/** @deprecated Use EvaluationItem instead */
export type RankingItem = EvaluationItem;
/** @deprecated Use EvaluationItemResult instead */
export type RankingItemResult = EvaluationItemResult;
/** @deprecated Use EvaluationResults instead */
export type RankingResults = EvaluationResults;
/** @deprecated Use EvaluationGameState instead */
export type RankingGameState = EvaluationGameState;
