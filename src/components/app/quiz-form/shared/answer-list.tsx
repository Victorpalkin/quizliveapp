import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, X } from 'lucide-react';
import { Control } from 'react-hook-form';
import type { QuizFormData } from '../../quiz-form';

interface AnswerListProps {
  questionIndex: number;
  answers: Array<{ text: string }>;
  control: Control<QuizFormData>;
  onUpdateAnswer: (answerIndex: number, text: string) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
  canAddMore: boolean;
  canRemove: boolean;
  renderCorrectSelector?: (answerIndex: number) => React.ReactNode;
}

export function AnswerList({
  questionIndex,
  answers,
  control,
  onUpdateAnswer,
  onAddAnswer,
  onRemoveAnswer,
  canAddMore,
  canRemove,
  renderCorrectSelector,
}: AnswerListProps) {
  return (
    <div className="space-y-3">
      {answers.map((ans, aIndex) => (
        <FormField
          key={aIndex}
          control={control}
          name={`questions.${questionIndex}.answers.${aIndex}.text`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              {renderCorrectSelector && (
                <FormControl>
                  {renderCorrectSelector(aIndex)}
                </FormControl>
              )}
              <Input
                {...field}
                placeholder={`Answer ${aIndex + 1}`}
                maxLength={200}
                onChange={(e) => {
                  field.onChange(e);
                  onUpdateAnswer(aIndex, e.target.value);
                }}
              />
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveAnswer(aIndex)}
                  type="button"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </FormItem>
          )}
        />
      ))}
      {canAddMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddAnswer}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Answer
        </Button>
      )}
    </div>
  );
}
