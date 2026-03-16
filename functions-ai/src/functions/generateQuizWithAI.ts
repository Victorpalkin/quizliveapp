import { HttpsError } from 'firebase-functions/v2/https';
import { createAIHandler, buildGeminiContents } from '../utils/createAIHandler';
import { stripMarkdownCodeBlocks } from '../utils/stripMarkdownCodeBlocks';
import type { GenerateQuizRequest, GenerateQuizResponse } from '../types';
import { QUIZ_SYSTEM_PROMPT } from '../prompts/quizPrompt';

/**
 * Parses and validates the Gemini response for quiz generation
 */
function parseQuizResponse(responseText: string): GenerateQuizResponse {
  const jsonStr = stripMarkdownCodeBlocks(responseText);

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.quiz || !parsed.quiz.title || !parsed.quiz.questions) {
      throw new Error('Invalid quiz structure');
    }

    for (const question of parsed.quiz.questions) {
      if (!question.type || !question.text) {
        throw new Error('Invalid question structure');
      }

      if (!question.timeLimit) {
        question.timeLimit = 20;
      }

      if (question.type === 'single-choice') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error('Single-choice question must have at least 2 answers');
        }
        if (typeof question.correctAnswerIndex !== 'number') {
          throw new Error('Single-choice question must have correctAnswerIndex');
        }
      } else if (question.type === 'multiple-choice') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error('Multiple-choice question must have at least 2 answers');
        }
        if (!Array.isArray(question.correctAnswerIndices) || question.correctAnswerIndices.length === 0) {
          throw new Error('Multiple-choice question must have correctAnswerIndices');
        }
      } else if (question.type === 'slider') {
        if (typeof question.minValue !== 'number' || typeof question.maxValue !== 'number') {
          throw new Error('Slider question must have minValue and maxValue');
        }
        if (typeof question.correctValue !== 'number') {
          throw new Error('Slider question must have correctValue');
        }
      } else if (question.type === 'free-response') {
        if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
          throw new Error('Free-response question must have correctAnswer');
        }
        if (question.caseSensitive === undefined) {
          question.caseSensitive = false;
        }
        if (question.allowTypos === undefined) {
          question.allowTypos = true;
        }
        if (!Array.isArray(question.alternativeAnswers)) {
          question.alternativeAnswers = [];
        }
      }
    }

    return {
      quiz: parsed.quiz,
      message: parsed.message || 'Quiz generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse quiz response:', responseText);
    throw new HttpsError('internal', 'Failed to parse AI response. Please try again.');
  }
}

/**
 * Cloud Function to generate quiz questions using Gemini
 */
export const generateQuizWithAI = createAIHandler<GenerateQuizRequest, GenerateQuizResponse>({
  systemPrompt: QUIZ_SYSTEM_PROMPT,
  activityType: 'quiz',
  buildContents: (data) => buildGeminiContents(
    data.prompt,
    data.conversationHistory,
    data.currentQuiz ? { label: 'quiz', data: data.currentQuiz } : undefined
  ),
  parseResponse: parseQuizResponse,
  getSuccessLog: (uid, result) =>
    `Quiz generated for user ${uid}: ${result.quiz.title} with ${result.quiz.questions.length} questions`,
});
