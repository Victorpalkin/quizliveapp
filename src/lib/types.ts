export interface Answer {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  correctAnswerIndex: number;
  timeLimit: number; // in seconds
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface Player {
    id: string;
    name: string;
}
