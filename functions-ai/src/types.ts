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
  // For quiz images
  quizId?: string;     // For existing quizzes
  tempId?: string;     // For new quizzes (temp storage)
  questionIndex?: number;
  // For presentation slide images
  presentationId?: string;
  slideId?: string;
}

// Response from generate image
export interface GenerateImageResponse {
  imageUrl: string;
}

/**
 * Types for AI Presentation Generation
 */

// Presentation slide types
export type PresentationSlideType =
  | 'content'           // Informational slide
  | 'quiz'              // Quiz question (scored)
  | 'poll'              // Poll question (no scoring)
  | 'thoughts-collect'  // Word cloud collection
  | 'thoughts-results'  // Word cloud display
  | 'rating-describe'   // Item description for rating
  | 'rating-input'      // Rating input slide
  | 'rating-results'    // Rating results display
  | 'rating-summary'    // Summary with charts/heatmap
  | 'leaderboard';      // Leaderboard slide

// Rating item for rating-describe slides
export interface GeneratedRatingItem {
  title: string;
  description?: string;
}

// Rating metric for rating-input slides
export interface GeneratedRatingMetric {
  type: 'stars' | 'numeric' | 'labels';
  min: number;
  max: number;
  question?: string;
  labels?: string[];  // For 'labels' type
}

// Poll question types
export interface GeneratedPollQuestion {
  type: 'poll-single' | 'poll-multiple';
  text: string;
  answers: Answer[];
  timeLimit?: number;
}

// Generated presentation slide
export interface GeneratedPresentationSlide {
  id?: string;  // Will be auto-generated if not present
  type: PresentationSlideType;
  order?: number;  // Will be set based on array position

  // For 'content' type
  title?: string;
  description?: string;

  // For 'quiz' type
  question?: GeneratedQuestion;

  // For 'poll' type
  pollQuestion?: GeneratedPollQuestion;

  // For 'thoughts-collect' type
  thoughtsPrompt?: string;
  thoughtsMaxPerPlayer?: number;

  // For 'thoughts-results' and 'rating-results' types
  sourceSlideId?: string;

  // For 'rating-describe' type
  ratingItem?: GeneratedRatingItem;

  // For 'rating-input' type
  ratingInputSlideId?: string;
  ratingMetric?: GeneratedRatingMetric;

  // For 'rating-results' type
  ratingResultsMode?: 'single' | 'comparison' | 'live';

  // For 'rating-summary' type
  summaryTitle?: string;
  summaryDefaultView?: 'ranking' | 'chart' | 'heatmap' | 'matrix';

  // For 'leaderboard' type
  leaderboardMode?: 'standard' | 'podium';
  leaderboardMaxDisplay?: number;
}

// Generated presentation structure
export interface GeneratedPresentation {
  title: string;
  description?: string;
  slides: GeneratedPresentationSlide[];
}

// Request to generate presentation
export interface GeneratePresentationRequest {
  prompt: string;
  conversationHistory?: ChatMessage[];
  currentPresentation?: GeneratedPresentation;
}

// Response from generate presentation
export interface GeneratePresentationResponse {
  presentation: GeneratedPresentation;
  message: string;
}
