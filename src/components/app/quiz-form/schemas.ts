import * as z from 'zod';

const answerSchema = z.object({
  text: z.string().min(1, "Answer text can't be empty."),
});

// Single choice question schema - exactly one correct answer
const singleChoiceQuestionSchema = z.object({
  type: z.literal('single-choice'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  correctAnswerIndex: z.number().min(0, 'Must select a correct answer.'),
  timeLimit: z.number().optional(),
  showLiveResults: z.boolean().optional(),
});

// Multiple choice question schema - multiple correct answers with proportional scoring
const multipleChoiceQuestionSchema = z.object({
  type: z.literal('multiple-choice'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  correctAnswerIndices: z.array(z.number()).min(2, 'Multiple choice questions must have at least 2 correct answers.'),
  showAnswerCount: z.boolean().optional(),
  timeLimit: z.number().optional(),
  showLiveResults: z.boolean().optional(),
});

// Slider question schema
const sliderQuestionSchema = z.object({
  type: z.literal('slider'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  minValue: z.number(),
  maxValue: z.number(),
  correctValue: z.number(),
  step: z.number().optional(),
  unit: z.string().optional(),
  acceptableError: z.number().optional(),
  timeLimit: z.number().optional(),
});

// Slide question schema - informational only
const slideQuestionSchema = z.object({
  type: z.literal('slide'),
  text: z.string().min(1, 'Slide text cannot be empty.'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  timeLimit: z.number().optional(),
});

// Free response question schema - player types their answer
const freeResponseQuestionSchema = z.object({
  type: z.literal('free-response'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  correctAnswer: z.string().min(1, 'Correct answer cannot be empty.'),
  alternativeAnswers: z.array(z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  allowTypos: z.boolean().optional(),
  timeLimit: z.number().optional(),
});

// Poll single choice question schema - no correct answer, no scoring
const pollSingleQuestionSchema = z.object({
  type: z.literal('poll-single'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  timeLimit: z.number().optional(),
  showLiveResults: z.boolean().optional(),
});

// Poll multiple choice question schema - no correct answer, no scoring
const pollMultipleQuestionSchema = z.object({
  type: z.literal('poll-multiple'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  timeLimit: z.number().optional(),
  showLiveResults: z.boolean().optional(),
});

// Discriminated union for question types
const questionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  sliderQuestionSchema,
  slideQuestionSchema,
  freeResponseQuestionSchema,
  pollSingleQuestionSchema,
  pollMultipleQuestionSchema,
]);

// Crowdsource settings schema with conditional validation
const crowdsourceSchema = z.object({
  enabled: z.boolean(),
  topicPrompt: z.string().optional(),
  questionsNeeded: z.number().min(1).max(50).optional(),
  maxSubmissionsPerPlayer: z.number().min(1).max(10).optional(),
  integrationMode: z.enum(['append', 'prepend', 'replace']).optional(),
}).optional().superRefine((data, ctx) => {
  if (data?.enabled) {
    if (!data.topicPrompt || data.topicPrompt.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Topic prompt is required when crowdsourcing is enabled.',
        path: ['topicPrompt'],
      });
    }
    if (!data.questionsNeeded || data.questionsNeeded < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Questions needed must be at least 1.',
        path: ['questionsNeeded'],
      });
    }
    if (!data.maxSubmissionsPerPlayer || data.maxSubmissionsPerPlayer < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max submissions per player must be at least 1.',
        path: ['maxSubmissionsPerPlayer'],
      });
    }
    if (!data.integrationMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Integration mode is required.',
        path: ['integrationMode'],
      });
    }
  }
});

export const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'A quiz must have at least one question.'),
  crowdsource: crowdsourceSchema,
});

export type QuizFormData = z.infer<typeof quizSchema>;
