import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { MultipleChoiceQuestion } from '@/lib/types';
import type { QuizFormData } from '../../quiz-form';
import { AnswerList } from '../shared/answer-list';

interface MultipleChoiceEditorProps {
  question: MultipleChoiceQuestion;
  questionIndex: number;
  control: Control<QuizFormData>;
  onUpdateQuestion: (updatedQuestion: MultipleChoiceQuestion) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
}

export function MultipleChoiceEditor({
  question,
  questionIndex,
  control,
  onUpdateQuestion,
  onAddAnswer,
  onRemoveAnswer,
}: MultipleChoiceEditorProps) {
  const { toast } = useToast();

  return (
    <>
      {/* Multiple Choice Settings */}
      <div className="space-y-4 border-l-2 border-primary pl-4">
        <div className="space-y-0.5">
          <FormLabel>Multiple Choice Settings</FormLabel>
          <p className="text-sm text-muted-foreground">
            Multiple correct answers with proportional scoring
          </p>
        </div>

        <FormItem className="flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <FormLabel>Show Answer Count</FormLabel>
            <p className="text-sm text-muted-foreground">
              Tell players how many answers to select
            </p>
          </div>
          <FormControl>
            <Checkbox
              checked={question.showAnswerCount !== false}
              onCheckedChange={(checked) => {
                onUpdateQuestion({ ...question, showAnswerCount: !!checked });
              }}
            />
          </FormControl>
        </FormItem>
      </div>

      {/* Answer List */}
      <FormField
        control={control}
        name={`questions.${questionIndex}.correctAnswerIndices`}
        render={() => (
          <FormItem>
            <div className="mb-4">
              <FormLabel className="text-base">Answers</FormLabel>
              <p className="text-sm text-muted-foreground">Select at least 2 correct answers.</p>
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
              renderCorrectSelector={(aIndex) => (
                <Checkbox
                  checked={question.correctAnswerIndices.includes(aIndex)}
                  onCheckedChange={(checked) => {
                    let newCorrectIndices: number[];
                    if (checked) {
                      newCorrectIndices = [...question.correctAnswerIndices, aIndex].sort();
                    } else {
                      newCorrectIndices = question.correctAnswerIndices.filter((i) => i !== aIndex);
                    }
                    if (newCorrectIndices.length < 2) {
                      toast({
                        variant: 'destructive',
                        title: "You must have at least 2 correct answers for multiple choice questions."
                      });
                      return;
                    }
                    onUpdateQuestion({ ...question, correctAnswerIndices: newCorrectIndices });
                  }}
                />
              )}
            />
            <FormMessage>{/* Error message handled by form */}</FormMessage>
          </FormItem>
        )}
      />
    </>
  );
}
