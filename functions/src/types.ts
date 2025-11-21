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

  // Question metadata (passed from client to avoid quiz fetch)
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'poll-single' | 'poll-multiple';
  questionTimeLimit?: number;

  // Type-specific metadata
  correctAnswerIndex?: number;       // For single-choice
  correctAnswerIndices?: number[];   // For multiple-choice
  correctValue?: number;             // For slider
  minValue?: number;                 // For slider
  maxValue?: number;                 // For slider
  acceptableError?: number;          // For slider - absolute error threshold
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
  questionType: 'single-choice' | 'multiple-choice' | 'slider' | 'poll-single' | 'poll-multiple';
  timestamp: admin.firestore.FieldValue;
  answerIndex?: number;
  answerIndices?: number[];
  sliderValue?: number;
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
 */
export interface CreateHostAccountResult {
  success: boolean;
  userId: string;
  message: string;
  verificationLink: string;
}
