
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
}

// Discriminated union of all question types
export type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion;

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

export interface Player {
    id: string;
    name: string;
    score: number;
    lastAnswerIndex?: number | null;      // For single-choice questions
    lastAnswerIndices?: number[] | null;  // For multi-choice questions
    lastSliderValue?: number | null;      // For slider questions
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
