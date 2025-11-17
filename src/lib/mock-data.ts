
import type { Quiz, Player } from './types';

// This data is now only used for type reference and can be removed
// once all components are fully migrated to Firestore.

export const mockQuiz: Quiz = {
  id: 'mock123',
  title: 'World Capitals Trivia',
  description: 'A fun quiz about geography!',
  hostId: 'mockHost',
  questions: [
    {
      id: 'q1',
      type: 'single-choice',
      text: 'What is the capital of Japan?',
      timeLimit: 20,
      answers: [
        { text: 'Beijing' },
        { text: 'Seoul' },
        { text: 'Tokyo' },
        { text: 'Bangkok' },
      ],
      correctAnswerIndex: 2,
    },
    {
      id: 'q2',
      type: 'single-choice',
      text: 'What is the capital of Australia?',
      timeLimit: 20,
      answers: [
        { text: 'Sydney' },
        { text: 'Canberra' },
        { text: 'Melbourne' },
        { text: 'Wellington' },
      ],
      correctAnswerIndex: 1,
    },
  ],
};

export const mockPlayers: Player[] = [
    { id: 'p1', name: 'PlayerOne', score: 0 },
    { id: 'p2', name: 'QuizMaster', score: 0 },
    { id: 'p3', name: 'TriviaFan', score: 0 },
];
