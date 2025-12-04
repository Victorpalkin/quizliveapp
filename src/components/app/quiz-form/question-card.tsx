import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, GripVertical, ChevronDown, ChevronRight, CheckCircle2, ListChecks, SlidersHorizontal, FileText, MessageSquare, Vote, ListTodo } from 'lucide-react';
import { QuestionTypeTooltip } from '@/components/ui/feature-tooltip';
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

const TYPE_LABELS: Record<string, string> = {
  'single-choice': 'Single Choice',
  'multiple-choice': 'Multiple Choice',
  'slider': 'Slider',
  'slide': 'Slide',
  'free-response': 'Free Response',
  'poll-single': 'Poll (Single)',
  'poll-multiple': 'Poll (Multiple)',
};

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
    collapsedQuestions,
    toggleCollapse,
    quizId,
    tempId,
  } = useQuizFormContext();

  const isCollapsed = collapsedQuestions.has(questionIndex);
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

      <Collapsible open={!isCollapsed} onOpenChange={() => toggleCollapse(questionIndex)}>
        <Card className={cn(
          "bg-background/50 ml-8",
          isDragging && "opacity-50 shadow-lg"
        )}>
        <CardHeader className="flex-row items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CardTitle className="text-lg">Q{questionIndex + 1}</CardTitle>
            <Badge variant="secondary">{TYPE_LABELS[question.type]}</Badge>
            {isCollapsed && (
              <span className="text-muted-foreground truncate max-w-[300px] text-sm">
                {question.text || 'No question text'}
              </span>
            )}
          </div>
          {totalQuestions > 1 && (
            <Button variant="ghost" size="icon" onClick={() => onRemoveQuestion(questionIndex)} type="button">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {/* Question Type Selector */}
        <FormItem>
          <div className="flex items-center gap-2">
            <FormLabel>Question Type</FormLabel>
            <QuestionTypeTooltip type={question.type as keyof typeof TYPE_LABELS} />
          </div>
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
              <SelectItem value="single-choice">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Single Choice</span>
                  <span className="text-xs text-muted-foreground ml-auto">One correct answer</span>
                </div>
              </SelectItem>
              <SelectItem value="multiple-choice">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-blue-500" />
                  <span>Multiple Choice</span>
                  <span className="text-xs text-muted-foreground ml-auto">Multiple correct</span>
                </div>
              </SelectItem>
              <SelectItem value="free-response">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span>Free Response</span>
                  <span className="text-xs text-muted-foreground ml-auto">Type answer</span>
                </div>
              </SelectItem>
              <SelectItem value="slider">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                  <span>Slider</span>
                  <span className="text-xs text-muted-foreground ml-auto">Estimate a number</span>
                </div>
              </SelectItem>
              <SelectItem value="slide">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span>Info Slide</span>
                  <span className="text-xs text-muted-foreground ml-auto">No question</span>
                </div>
              </SelectItem>
              <SelectItem value="poll-single">
                <div className="flex items-center gap-2">
                  <Vote className="h-4 w-4 text-teal-500" />
                  <span>Poll (Single)</span>
                  <span className="text-xs text-muted-foreground ml-auto">Opinion, 1 choice</span>
                </div>
              </SelectItem>
              <SelectItem value="poll-multiple">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-teal-500" />
                  <span>Poll (Multiple)</span>
                  <span className="text-xs text-muted-foreground ml-auto">Opinion, multi</span>
                </div>
              </SelectItem>
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
        </CollapsibleContent>
      </Card>
      </Collapsible>
    </div>
  );
}
