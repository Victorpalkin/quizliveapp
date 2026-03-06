import { HttpsError } from 'firebase-functions/v2/https';
import { createAIHandler, buildGeminiContents } from '../utils/createAIHandler';
import { stripMarkdownCodeBlocks } from '../utils/stripMarkdownCodeBlocks';
import type { GeneratePollRequest, GeneratePollResponse } from '../types';
import { POLL_SYSTEM_PROMPT } from '../prompts/pollPrompt';

/**
 * Parses and validates the Gemini response for poll generation
 */
function parsePollResponse(responseText: string): GeneratePollResponse {
  const jsonStr = stripMarkdownCodeBlocks(responseText);

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.poll || !parsed.poll.title || !parsed.poll.questions) {
      throw new Error('Invalid poll structure');
    }

    for (const question of parsed.poll.questions) {
      if (!question.type || !question.text) {
        throw new Error('Invalid question structure');
      }

      if (!question.timeLimit) {
        question.timeLimit = question.type === 'poll-free-text' ? 60 : 30;
      }

      if (question.showLiveResults === undefined) {
        question.showLiveResults = true;
      }

      if (question.type === 'poll-single' || question.type === 'poll-multiple') {
        if (!Array.isArray(question.answers) || question.answers.length < 2) {
          throw new Error(`${question.type} question must have at least 2 answers`);
        }
      } else if (question.type === 'poll-free-text') {
        if (!question.placeholder) {
          question.placeholder = 'Share your thoughts...';
        }
        if (!question.maxLength) {
          question.maxLength = 500;
        }
      } else {
        throw new Error(`Unknown question type: ${question.type}`);
      }
    }

    return {
      poll: parsed.poll,
      message: parsed.message || 'Poll generated successfully!',
    };
  } catch (error) {
    console.error('Failed to parse poll response:', responseText);
    throw new HttpsError('internal', 'Failed to parse AI response. Please try again.');
  }
}

/**
 * Cloud Function to generate poll questions using Gemini
 */
export const generatePollWithAI = createAIHandler<GeneratePollRequest, GeneratePollResponse>({
  systemPrompt: POLL_SYSTEM_PROMPT,
  activityType: 'poll',
  buildContents: (data) => buildGeminiContents(
    data.prompt,
    data.conversationHistory,
    data.currentPoll ? { label: 'poll', data: data.currentPoll } : undefined
  ),
  parseResponse: parsePollResponse,
  getSuccessLog: (uid, result) =>
    `Poll generated for user ${uid}: ${result.poll.title} with ${result.poll.questions.length} questions`,
});
