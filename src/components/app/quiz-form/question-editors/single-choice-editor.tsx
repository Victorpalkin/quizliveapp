import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SingleChoiceQuestion } from '@/lib/types';
import type { QuizFormData } from '../../quiz-form';
import { AnswerList } from '../shared/answer-list';

interface SingleChoiceEditorProps {
  question: SingleChoiceQuestion;
  questionIndex: number;
  control: Control<QuizFormData>;
  onUpdateQuestion: (updatedQuestion: SingleChoiceQuestion) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
}

export function SingleChoiceEditor({
  question,
  questionIndex,
  control,
  onUpdateQuestion,
  onAddAnswer,
  onRemoveAnswer,
}: SingleChoiceEditorProps) {
  return (
    <FormField
      control={control}
      name={`questions.${questionIndex}.correctAnswerIndex`}
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel className="text-base">Answers</FormLabel>
            <p className="text-sm text-muted-foreground">Select one correct answer.</p>
          </div>
          <RadioGroup
            value={String(question.correctAnswerIndex)}
            onValueChange={(value) => {
              onUpdateQuestion({ ...question, correctAnswerIndex: parseInt(value, 10) });
            }}
          >
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
              renderCorrectSelector={(aIndex) => (
                <RadioGroupItem value={String(aIndex)} />
              )}
            />
          </RadioGroup>
          <FormMessage>{/* Error message handled by form */}</FormMessage>
        </FormItem>
      )}
    />
  );
}
