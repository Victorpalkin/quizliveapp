// @/lib/actions.ts
'use server';

import {
  suggestQuizQuestions,
  type SuggestQuizQuestionsInput,
} from '@/ai/flows/suggest-quiz-questions';

export async function getAiQuizQuestions(
  prevState: any,
  formData: FormData
) {
  const topic = formData.get('topic') as string;

  if (!topic) {
    return { success: false, error: 'Topic is required.' };
  }

  try {
    const result = await suggestQuizQuestions({ topic });
    return { success: true, questions: result.questions };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate questions from AI.' };
  }
}
