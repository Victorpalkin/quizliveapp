
export interface Answer {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id?: string;
  text: string;
  answers: Answer[];
  correctAnswerIndex: number;
  timeLimit?: number; // in seconds
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  hostId: string;
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
    state: 'lobby' | 'question' | 'leaderboard' | 'ended';
    currentQuestionIndex: number;
    gamePin: string;
}
