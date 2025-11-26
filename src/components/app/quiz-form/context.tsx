'use client';

import { createContext, useContext } from 'react';
import { Control } from 'react-hook-form';
import type { QuizFormData } from '../quiz-form';
import type { Question } from '@/lib/types';

export interface QuizFormContextValue {
  // Form control
  control: Control<QuizFormData>;

  // Question operations
  updateQuestion: (index: number, question: Question) => void;
  removeQuestion: (index: number) => void;
  convertType: (index: number, type: 'single-choice' | 'multiple-choice' | 'slider' | 'slide' | 'free-response' | 'poll-single' | 'poll-multiple') => void;

  // Answer operations
  addAnswer: (questionIndex: number) => void;
  removeAnswer: (questionIndex: number, answerIndex: number) => void;

  // Image operations
  uploadImage: (questionIndex: number, file: File) => void;
  removeImage: (questionIndex: number) => void;

  // State
  totalQuestions: number;

  // Quiz identification (for AI image generation)
  quizId?: string;   // For existing quizzes (edit page)
  tempId?: string;   // For new quizzes (create page)
}

const QuizFormContext = createContext<QuizFormContextValue | null>(null);

export function useQuizFormContext() {
  const context = useContext(QuizFormContext);
  if (!context) {
    throw new Error('useQuizFormContext must be used within QuizFormProvider');
  }
  return context;
}

export function QuizFormProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: QuizFormContextValue;
}) {
  return (
    <QuizFormContext.Provider value={value}>
      {children}
    </QuizFormContext.Provider>
  );
}
