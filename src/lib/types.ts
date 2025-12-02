
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
  correctAnswerIndices: number[]; // Multiple indices for correct answers
  showAnswerCount?: boolean; // Default: true, show how many answers to select
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

export interface Game {
    id: string;
    quizId: string;
    hostId: string;
    state: 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';
    currentQuestionIndex: number;
    gamePin: string;
    questionStartTime?: Timestamp; // Firestore server timestamp when current question started (for timer sync)
    crowdsourceState?: CrowdsourceState;  // Runtime state for crowdsourced questions
    questions?: Question[];  // Override questions (used when crowdsourced questions are integrated)
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
  answerCounts: number[];  // Per-answer distribution for current question
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
