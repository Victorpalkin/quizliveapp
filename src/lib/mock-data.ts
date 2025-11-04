import type { Quiz, Player } from './types';

export const mockQuiz: Quiz = {
  id: 'mock123',
  title: 'World Capitals Trivia',
  description: 'A fun quiz about geography!',
  questions: [
    {
      id: 'q1',
      text: 'What is the capital of Japan?',
      timeLimit: 20,
      answers: [
        { text: 'Beijing', isCorrect: false },
        { text: 'Seoul', isCorrect: false },
        { text: 'Tokyo', isCorrect: true },
        { text: 'Bangkok', isCorrect: false },
      ],
      correctAnswerIndex: 2,
    },
    {
      id: 'q2',
      text: 'What is the capital of Australia?',
      timeLimit: 20,
      answers: [
        { text: 'Sydney', isCorrect: false },
        { text: 'Canberra', isCorrect: true },
        { text: 'Melbourne', isCorrect: false },
        { text: 'Wellington', isCorrect: false },
      ],
      correctAnswerIndex: 1,
    },
    {
      id: 'q3',
      text: 'What is the capital of Brazil?',
      timeLimit: 20,
      answers: [
        { text: 'São Paulo', isCorrect: false },
        { text: 'Rio de Janeiro', isCorrect: false },
        { text: 'Buenos Aires', isCorrect: false },
        { text: 'Brasília', isCorrect: true },
      ],
      correctAnswerIndex: 3,
    },
    {
      id: 'q4',
      text: 'What is the capital of Canada?',
      timeLimit: 20,
      answers: [
        { text: 'Toronto', isCorrect: false },
        { text: 'Vancouver', isCorrect: false },
        { text: 'Ottawa', isCorrect: true },
        { text: 'Montreal', isCorrect: false },
      ],
      correctAnswerIndex: 2,
    },
  ],
};

export const mockPlayers: Player[] = [
    { id: 'p1', name: 'PlayerOne' },
    { id: 'p2', name: 'QuizMaster' },
    { id: 'p3', name: 'TriviaFan' },
    { id: 'p4', name: 'SmartyPants' },
    { id: 'p5', name: 'CaptainQ' },
    { id: 'p6', name: 'User_6' },
    { id: 'p7', name: 'Player_7' },
];
