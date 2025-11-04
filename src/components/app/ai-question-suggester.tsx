// src/components/app/ai-question-suggester.tsx
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAiQuizQuestions } from '@/lib/actions';
import { Lightbulb, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  success: false,
  questions: [] as string[],
  error: null as string | null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Lightbulb className="mr-2 h-4 w-4" />
          Suggest Questions
        </>
      )}
    </Button>
  );
}

type AiQuestionSuggesterProps = {
  onAddQuestion: (questionText: string) => void;
};

export function AiQuestionSuggester({ onAddQuestion }: AiQuestionSuggesterProps) {
  const [state, formAction] = useActionState(getAiQuizQuestions, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success === false && state.error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: state.error,
      });
    }
  }, [state, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-yellow-400" />
          AI Question Suggester
        </CardTitle>
        <CardDescription>
          Stuck for ideas? Enter a topic and let AI generate some questions for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="flex items-start gap-4">
            <Input
              name="topic"
              placeholder="e.g., 'The Solar System' or '80s Pop Music'"
              className="flex-grow"
            />
            <SubmitButton />
          </div>
          {state.success && state.questions.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">Suggestions:</h3>
              <ul className="space-y-2">
                {state.questions.map((q, index) => (
                  <li key={index} className="flex items-center justify-between p-2 rounded-md bg-background/50">
                    <span className="flex-grow pr-4">{q}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onAddQuestion(q)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
