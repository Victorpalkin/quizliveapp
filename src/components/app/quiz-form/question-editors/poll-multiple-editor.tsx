import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { PollMultipleQuestion } from '@/lib/types';
import type { QuizFormData } from '../../quiz-form';
import { AnswerList } from '../shared/answer-list';

interface PollMultipleEditorProps {
  question: PollMultipleQuestion;
  questionIndex: number;
  control: Control<QuizFormData>;
  onUpdateQuestion: (updatedQuestion: PollMultipleQuestion) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
}

export function PollMultipleEditor({
  question,
  questionIndex,
  control,
  onUpdateQuestion,
  onAddAnswer,
  onRemoveAnswer,
}: PollMultipleEditorProps) {
  return (
    <FormField
      control={control}
      name={`questions.${questionIndex}.answers`}
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel className="text-base">Answer Options</FormLabel>
            <p className="text-sm text-muted-foreground">Poll question - players can select multiple options. No points awarded.</p>
          </div>
          <AnswerList
            questionIndex={questionIndex}
            answers={question.answers}
            control={control}
            onUpdateAnswer={(aIndex, text) => {
              const newAnswers = [...question.answers];
              newAnswers[aIndex] = { text };
              onUpdateQuestion({ ...question, answers: newAnswers });
            }}
            onAddAnswer={onAddAnswer}
            onRemoveAnswer={onRemoveAnswer}
            canAddMore={question.answers.length < 8}
            canRemove={question.answers.length > 2}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
