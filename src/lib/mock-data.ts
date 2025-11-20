
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
      type: 'slide',
      text: 'Did You Know?',
      description: 'The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion of the iron on hot days!',
      timeLimit: 10,
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      text: 'Which of these cities are European capitals?',
      timeLimit: 20,
      answers: [
        { text: 'London' },
        { text: 'New York' },
        { text: 'Paris' },
        { text: 'Tokyo' },
      ],
      correctAnswerIndices: [0, 2],
      showAnswerCount: true,
    },
    {
      id: 'q4',
      type: 'slider',
      text: 'How tall is the Eiffel Tower (in meters)?',
      timeLimit: 20,
      minValue: 200,
      maxValue: 400,
      correctValue: 324,
      step: 1,
      unit: 'm',
    },
    {
      id: 'q5',
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
    { id: 'p1', name: 'PlayerOne', score: 0, answers: [], currentStreak: 0 },
    { id: 'p2', name: 'QuizMaster', score: 0, answers: [], currentStreak: 0 },
    { id: 'p3', name: 'TriviaFan', score: 0, answers: [], currentStreak: 0 },
];
