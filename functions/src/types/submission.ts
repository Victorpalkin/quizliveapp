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
