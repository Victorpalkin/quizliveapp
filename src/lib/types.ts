
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

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  hostId: string;
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

export interface Game {
    id: string;
    quizId: string;
    hostId: string;
    state: 'lobby' | 'preparing' | 'question' | 'leaderboard' | 'ended';
    currentQuestionIndex: number;
    gamePin: string;
    questionStartTime?: Timestamp; // Firestore server timestamp when current question started (for timer sync)
}

// Cloud Function response interface for submitAnswer
export interface SubmitAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  isPartiallyCorrect?: boolean; // Only for multiple-choice questions
  points: number;
  newScore: number;
  currentStreak?: number;
  // Rank info for O(1) client access (avoids O(n²) subscription problem)
  rank: number;
  totalPlayers: number;
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

export interface GameLeaderboard {
  topPlayers: LeaderboardEntry[];
  totalPlayers: number;
  totalAnswered: number;
  answerCounts: number[];  // Per-answer distribution for current question
  lastUpdated: Timestamp | null;
}
