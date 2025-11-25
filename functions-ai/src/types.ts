/**
 * Types for AI Quiz Generation
 */

// Question types supported by the quiz system
export type QuestionType = 'single-choice' | 'multiple-choice' | 'slider' | 'slide';

// Answer option for choice questions
export interface Answer {
  text: string;
  isCorrect?: boolean;
}

// Base question structure
interface BaseGeneratedQuestion {
  text: string;
  timeLimit?: number;
}

// Single choice question
export interface GeneratedSingleChoiceQuestion extends BaseGeneratedQuestion {
  type: 'single-choice';
  answers: Answer[];
  correctAnswerIndex: number;
}

// Multiple choice question
export interface GeneratedMultipleChoiceQuestion extends BaseGeneratedQuestion {
  type: 'multiple-choice';
  answers: Answer[];
  correctAnswerIndices: number[];
}

// Slider question
export interface GeneratedSliderQuestion extends BaseGeneratedQuestion {
  type: 'slider';
  minValue: number;
  maxValue: number;
  correctValue: number;
  step?: number;
  unit?: string;
}

// Slide (informational) question
export interface GeneratedSlideQuestion extends BaseGeneratedQuestion {
  type: 'slide';
  description?: string;
}

// Union of all question types
export type GeneratedQuestion =
  | GeneratedSingleChoiceQuestion
  | GeneratedMultipleChoiceQuestion
  | GeneratedSliderQuestion
  | GeneratedSlideQuestion;

// Generated quiz structure
export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}

// Chat message for conversation history
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Request to generate quiz
export interface GenerateQuizRequest {
  prompt: string;
  conversationHistory?: ChatMessage[];
  currentQuiz?: GeneratedQuiz;
}

// Response from generate quiz
export interface GenerateQuizResponse {
  quiz: GeneratedQuiz;
  message: string;
}

// Request to generate question image
export interface GenerateImageRequest {
  prompt: string;
  quizId?: string;     // For existing quizzes
  tempId?: string;     // For new quizzes (temp storage)
  questionIndex: number;
}

// Response from generate image
export interface GenerateImageResponse {
  imageUrl: string;
}
