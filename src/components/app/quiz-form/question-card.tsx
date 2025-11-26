import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion, FreeResponseQuestion, PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { ImageUpload } from './shared/image-upload';
import { SingleChoiceEditor } from './question-editors/single-choice-editor';
import { MultipleChoiceEditor } from './question-editors/multiple-choice-editor';
import { SliderEditor } from './question-editors/slider-editor';
import { SlideEditor } from './question-editors/slide-editor';
import { FreeResponseEditor } from './question-editors/free-response-editor';
import { PollSingleEditor } from './question-editors/poll-single-editor';
import { PollMultipleEditor } from './question-editors/poll-multiple-editor';
import { useQuizFormContext } from './context';

type Question = SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | FreeResponseQuestion | PollSingleQuestion | PollMultipleQuestion;

interface QuestionCardProps {
  id: string;
  question: Question;
  questionIndex: number;
}

export function QuestionCard({
  id,
  question,
  questionIndex,
}: QuestionCardProps) {
  // Get operations from context
  const {
    control,
    updateQuestion: onUpdateQuestion,
    removeQuestion: onRemoveQuestion,
    convertType: onConvertType,
    addAnswer: onAddAnswer,
    removeAnswer: onRemoveAnswer,
    uploadImage: onImageUpload,
    removeImage: onImageRemove,
    totalQuestions,
    quizId,
    tempId,
  } = useQuizFormContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10",
          "text-muted-foreground hover:text-foreground transition-colors",
          isDragging && "cursor-grabbing"
        )}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <Card className={cn(
        "bg-background/50 ml-8",
        isDragging && "opacity-50 shadow-lg"
      )}>
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle className="text-lg">Question {questionIndex + 1}</CardTitle>
        {totalQuestions > 1 && (
          <Button variant="ghost" size="icon" onClick={() => onRemoveQuestion(questionIndex)} type="button">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Type Selector */}
        <FormItem>
          <FormLabel>Question Type</FormLabel>
          <Select
            value={question.type}
            onValueChange={(value: 'single-choice' | 'multiple-choice' | 'slider' | 'slide' | 'free-response' | 'poll-single' | 'poll-multiple') => {
              onConvertType(questionIndex, value);
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="single-choice">Single Choice</SelectItem>
              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
              <SelectItem value="free-response">Free Response</SelectItem>
              <SelectItem value="slider">Slider (Numeric)</SelectItem>
              <SelectItem value="slide">Slide (Info)</SelectItem>
              <SelectItem value="poll-single">Poll (Single)</SelectItem>
              <SelectItem value="poll-multiple">Poll (Multiple)</SelectItem>
            </SelectContent>
          </Select>
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
                    onUpdateQuestion(questionIndex, { ...question, text: e.target.value });
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
            onUpload={(file) => onImageUpload(questionIndex, file)}
            onRemove={() => onImageRemove(questionIndex)}
            questionNumber={questionIndex + 1}
            questionText={question.text}
            quizId={quizId}
            tempId={tempId}
            onAIImageGenerated={(url) => onUpdateQuestion(questionIndex, { ...question, imageUrl: url })}
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
                    onUpdateQuestion(questionIndex, { ...question, timeLimit: time });
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
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
            onAddAnswer={() => onAddAnswer(questionIndex)}
            onRemoveAnswer={(aIndex) => onRemoveAnswer(questionIndex, aIndex)}
          />
        )}

        {question.type === 'multiple-choice' && (
          <MultipleChoiceEditor
            question={question}
            questionIndex={questionIndex}
            control={control}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
            onAddAnswer={() => onAddAnswer(questionIndex)}
            onRemoveAnswer={(aIndex) => onRemoveAnswer(questionIndex, aIndex)}
          />
        )}

        {question.type === 'slider' && (
          <SliderEditor
            question={question}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
          />
        )}

        {question.type === 'slide' && (
          <SlideEditor
            question={question}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
          />
        )}

        {question.type === 'free-response' && (
          <FreeResponseEditor
            question={question}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
          />
        )}

        {question.type === 'poll-single' && (
          <PollSingleEditor
            question={question}
            questionIndex={questionIndex}
            control={control}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
            onAddAnswer={() => onAddAnswer(questionIndex)}
            onRemoveAnswer={(aIndex) => onRemoveAnswer(questionIndex, aIndex)}
          />
        )}

        {question.type === 'poll-multiple' && (
          <PollMultipleEditor
            question={question}
            questionIndex={questionIndex}
            control={control}
            onUpdateQuestion={(updatedQ) => onUpdateQuestion(questionIndex, updatedQ)}
            onAddAnswer={() => onAddAnswer(questionIndex)}
            onRemoveAnswer={(aIndex) => onRemoveAnswer(questionIndex, aIndex)}
          />
        )}
      </CardContent>
    </Card>
    </div>
  );
}
