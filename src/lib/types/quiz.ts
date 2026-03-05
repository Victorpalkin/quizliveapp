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

// Poll question - free text, no scoring
export interface PollFreeTextQuestion extends BaseQuestion {
  type: 'poll-free-text';
  placeholder?: string;     // e.g., "Share your thoughts..."
  maxLength?: number;       // Default: 500
}

// Discriminated union of all question types
export type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion | PollFreeTextQuestion;

// Quiz question union (excludes PollFreeTextQuestion since quizzes don't use free text polls)
export type QuizQuestion = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion;

// Poll question union (for Poll activity)
export type PollQuestion = PollSingleQuestion | PollMultipleQuestion | PollFreeTextQuestion;

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

// Runtime state for crowdsourced questions during lobby
export interface CrowdsourceState {
  submissionsLocked: boolean;    // True when AI evaluation starts - no new submissions
  evaluationComplete: boolean;   // Has AI evaluated yet
  selectedCount: number;         // How many questions selected
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
