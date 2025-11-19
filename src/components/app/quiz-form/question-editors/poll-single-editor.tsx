import { Control } from 'react-hook-form';
import { FormItem, FormLabel } from '@/components/ui/form';
import type { PollSingleQuestion } from '@/lib/types';
import type { QuizFormData } from '../../quiz-form';
import { AnswerList } from '../shared/answer-list';

interface PollSingleEditorProps {
  question: PollSingleQuestion;
  questionIndex: number;
  control: Control<QuizFormData>;
  onUpdateQuestion: (updatedQuestion: PollSingleQuestion) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
}

export function PollSingleEditor({
  question,
  questionIndex,
  control,
  onUpdateQuestion,
  onAddAnswer,
  onRemoveAnswer,
}: PollSingleEditorProps) {
  return (
    <FormItem>
      <div className="mb-4">
        <FormLabel className="text-base">Answer Options</FormLabel>
        <p className="text-sm text-muted-foreground">Poll question - players select one option. No points awarded.</p>
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
    </FormItem>
  );
}
