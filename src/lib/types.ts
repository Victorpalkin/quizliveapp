
import { Timestamp } from 'firebase/firestore';

export interface Answer {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id?: string;
  text: string;
  answers: Answer[];
  correctAnswerIndices: number[];
  timeLimit?: number; // in seconds
  imageUrl?: string;
}

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
    lastAnswerIndex?: number | null;
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
