'use server';

/**
 * @fileOverview A quiz question suggestion AI agent.
 *
 * - suggestQuizQuestions - A function that suggests quiz questions based on a topic.
 * - SuggestQuizQuestionsInput - The input type for the suggestQuizQuestions function.
 * - SuggestQuizQuestionsOutput - The return type for the suggestQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestQuizQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic for which to suggest quiz questions.'),
});
export type SuggestQuizQuestionsInput = z.infer<typeof SuggestQuizQuestionsInputSchema>;

const SuggestQuizQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of suggested quiz questions.'),
});
export type SuggestQuizQuestionsOutput = z.infer<typeof SuggestQuizQuestionsOutputSchema>;

export async function suggestQuizQuestions(input: SuggestQuizQuestionsInput): Promise<SuggestQuizQuestionsOutput> {
  return suggestQuizQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestQuizQuestionsPrompt',
  input: {schema: SuggestQuizQuestionsInputSchema},
  output: {schema: SuggestQuizQuestionsOutputSchema},
  prompt: `You are an expert quiz question generator. Given a topic, you will generate a list of quiz questions related to that topic.\
\
Topic: {{{topic}}}\
\
Questions:`,
});

const suggestQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestQuizQuestionsFlow',
    inputSchema: SuggestQuizQuestionsInputSchema,
    outputSchema: SuggestQuizQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
