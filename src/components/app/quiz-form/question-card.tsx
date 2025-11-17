import { Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import type { SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion } from '@/lib/types';
import type { QuizFormData } from '../quiz-form';
import { ImageUpload } from './shared/image-upload';
import { SingleChoiceEditor } from './question-editors/single-choice-editor';
import { MultipleChoiceEditor } from './question-editors/multiple-choice-editor';
import { SliderEditor } from './question-editors/slider-editor';
import { SlideEditor } from './question-editors/slide-editor';

type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion;

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  control: Control<QuizFormData>;
  onUpdateQuestion: (updatedQuestion: Question) => void;
  onRemoveQuestion: () => void;
  onConvertType: (type: 'single-choice' | 'multiple-choice' | 'slider' | 'slide') => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (answerIndex: number) => void;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  control,
  onUpdateQuestion,
  onRemoveQuestion,
  onConvertType,
  onAddAnswer,
  onRemoveAnswer,
  onImageUpload,
  onImageRemove,
}: QuestionCardProps) {
  return (
    <Card className="bg-background/50">
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle className="text-lg">Question {questionIndex + 1}</CardTitle>
        {totalQuestions > 1 && (
          <Button variant="ghost" size="icon" onClick={onRemoveQuestion} type="button">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Type Selector */}
        <FormItem>
          <FormLabel>Question Type</FormLabel>
          <RadioGroup
            value={question.type}
            onValueChange={(value: 'single-choice' | 'multiple-choice' | 'slider' | 'slide') => {
              onConvertType(value);
            }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single-choice" id={`type-sc-${questionIndex}`} />
              <Label htmlFor={`type-sc-${questionIndex}`}>Single Choice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multiple-choice" id={`type-mc-${questionIndex}`} />
              <Label htmlFor={`type-mc-${questionIndex}`}>Multiple Choice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="slider" id={`type-slider-${questionIndex}`} />
              <Label htmlFor={`type-slider-${questionIndex}`}>Slider (Numeric)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="slide" id={`type-slide-${questionIndex}`} />
              <Label htmlFor={`type-slide-${questionIndex}`}>Slide (Info)</Label>
            </div>
          </RadioGroup>
        </FormItem>

        {/* Question Text */}
        <FormField
          control={control}
          name={`questions.${questionIndex}.text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <Input
                  placeholder="What is the capital of France?"
                  {...field}
                  maxLength={500}
                  onChange={(e) => {
                    field.onChange(e);
                    onUpdateQuestion({ ...question, text: e.target.value });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image and Time Limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload
            imageUrl={question.imageUrl}
            onUpload={onImageUpload}
            onRemove={onImageRemove}
            questionNumber={questionIndex + 1}
          />
          <FormField
            control={control}
            name={`questions.${questionIndex}.timeLimit`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Limit</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const time = parseInt(value, 10);
                    field.onChange(time);
                    onUpdateQuestion({ ...question, timeLimit: time });
                  }}
                  defaultValue={String(field.value || 20)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time limit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="20">20 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Question Type Specific Editor */}
        {question.type === 'single-choice' && (
          <SingleChoiceEditor
            question={question}
            questionIndex={questionIndex}
            control={control}
            onUpdateQuestion={onUpdateQuestion}
            onAddAnswer={onAddAnswer}
            onRemoveAnswer={onRemoveAnswer}
          />
        )}

        {question.type === 'multiple-choice' && (
          <MultipleChoiceEditor
            question={question}
            questionIndex={questionIndex}
            control={control}
            onUpdateQuestion={onUpdateQuestion}
            onAddAnswer={onAddAnswer}
            onRemoveAnswer={onRemoveAnswer}
          />
        )}

        {question.type === 'slider' && (
          <SliderEditor
            question={question}
            onUpdateQuestion={onUpdateQuestion}
          />
        )}

        {question.type === 'slide' && (
          <SlideEditor
            question={question}
            onUpdateQuestion={onUpdateQuestion}
          />
        )}
      </CardContent>
    </Card>
  );
}
