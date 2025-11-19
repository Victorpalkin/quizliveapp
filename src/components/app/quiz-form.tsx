'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Loader2, Save } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion, PollSingleQuestion, PollMultipleQuestion } from '@/lib/types';
import { useQuestionOperations } from './quiz-form/hooks/use-question-operations';
import { useImageUpload } from './quiz-form/hooks/use-image-upload';
import { QuestionCard } from './quiz-form/question-card';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const answerSchema = z.object({
  text: z.string().min(1, "Answer text can't be empty."),
});

// Single choice question schema - exactly one correct answer
const singleChoiceQuestionSchema = z.object({
  type: z.literal('single-choice'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  correctAnswerIndex: z.number().min(0, 'Must select a correct answer.'),
  timeLimit: z.number().optional(),
});

// Multiple choice question schema - multiple correct answers with proportional scoring
const multipleChoiceQuestionSchema = z.object({
  type: z.literal('multiple-choice'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  correctAnswerIndices: z.array(z.number()).min(2, 'Multiple choice questions must have at least 2 correct answers.'),
  showAnswerCount: z.boolean().optional(),
  timeLimit: z.number().optional(),
});

// Slider question schema
const sliderQuestionSchema = z.object({
  type: z.literal('slider'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  minValue: z.number(),
  maxValue: z.number(),
  correctValue: z.number(),
  step: z.number().optional(),
  unit: z.string().optional(),
  acceptableError: z.number().optional(),
  timeLimit: z.number().optional(),
});

// Slide question schema - informational only
const slideQuestionSchema = z.object({
  type: z.literal('slide'),
  text: z.string().min(1, 'Slide text cannot be empty.'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  timeLimit: z.number().optional(),
});

// Poll single choice question schema - no correct answer, no scoring
const pollSingleQuestionSchema = z.object({
  type: z.literal('poll-single'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  timeLimit: z.number().optional(),
});

// Poll multiple choice question schema - no correct answer, no scoring
const pollMultipleQuestionSchema = z.object({
  type: z.literal('poll-multiple'),
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  timeLimit: z.number().optional(),
});

// Discriminated union for question types
const questionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  sliderQuestionSchema,
  slideQuestionSchema,
  pollSingleQuestionSchema,
  pollMultipleQuestionSchema,
]);

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'A quiz must have at least one question.'),
});

export type QuizFormData = z.infer<typeof quizSchema>;

interface QuizFormProps {
  mode: 'create' | 'edit';
  initialData?: QuizFormData;
  onSubmit: (data: QuizFormData, imageFiles: Record<number, File>, imagesToDelete: string[]) => Promise<void>;
  isSubmitting: boolean;
  userId: string;
  additionalContent?: React.ReactNode; // For QuizShareManager in edit mode
}

export function QuizForm({ mode, initialData, onSubmit, isSubmitting, userId, additionalContent }: QuizFormProps) {
  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      questions: [],
    },
  });

  // Stable IDs for questions (for React key and DND)
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  // Custom hooks for question and image management
  const imageUploadHook = useImageUpload();
  const { imageFiles, imagesToDelete, handleImageUpload: handleImageUploadBase, removeImage: removeImageBase } = imageUploadHook;

  const questionOps = useQuestionOperations(form.setValue, imagesToDelete, imageFiles);
  const {
    questions,
    setQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addAnswer,
    removeAnswer,
    convertQuestionType,
    reorderQuestion,
  } = questionOps;

  // Configure DND sensors for better touch/mouse support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  );

  // Initialize questions on mount
  useEffect(() => {
    if (initialData) {
      setQuestions(initialData.questions as (SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion | PollSingleQuestion | PollMultipleQuestion)[]);
      // Generate stable IDs for initial questions
      setQuestionIds(initialData.questions.map(() => nanoid()));
    } else if (questions.length === 0) {
      addQuestion();
    }
  }, [initialData]);

  // Sync question IDs when questions array changes (add/remove)
  useEffect(() => {
    if (questions.length > questionIds.length) {
      // Questions were added
      const newIds = [...questionIds];
      while (newIds.length < questions.length) {
        newIds.push(nanoid());
      }
      setQuestionIds(newIds);
    } else if (questions.length < questionIds.length) {
      // Questions were removed
      setQuestionIds(questionIds.slice(0, questions.length));
    }
  }, [questions.length]);

  // Wrapper functions for image upload to pass question context
  const handleImageUpload = (qIndex: number, file: File) => {
    const question = questions[qIndex];
    handleImageUploadBase(qIndex, file, question, updateQuestion);
  };

  const removeImage = (qIndex: number) => {
    const question = questions[qIndex];
    removeImageBase(qIndex, question, updateQuestion);
  };

  const handleSubmit = async (data: QuizFormData) => {
    await onSubmit(data, imageFiles.current, imagesToDelete.current);
    imagesToDelete.current = [];
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = questionIds.indexOf(active.id as string);
    const newIndex = questionIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Reorder question IDs
      const newIds = [...questionIds];
      const [movedId] = newIds.splice(oldIndex, 1);
      newIds.splice(newIndex, 0, movedId);
      setQuestionIds(newIds);

      // Reorder questions
      reorderQuestion(oldIndex, newIndex);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'Create a New Quiz' : 'Edit Quiz'}</CardTitle>
            <CardDescription>
              {mode === 'create'
                ? 'Fill in the details for your new quiz. You can host it from your dashboard after saving.'
                : 'Update the details for your quiz below.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., World Capitals Trivia" {...field} maxLength={100} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A fun quiz about geography!" {...field} maxLength={500} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {mode === 'create' ? 'Add' : 'Edit'} questions and answers for your quiz. Each question can have between 2 and 8 answers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                {questions.map((q, qIndex) => (
                  <QuestionCard
                    key={questionIds[qIndex]}
                    id={questionIds[qIndex]}
                    question={q}
                    questionIndex={qIndex}
                    totalQuestions={questions.length}
                    control={form.control}
                    onUpdateQuestion={(updatedQuestion) => updateQuestion(qIndex, updatedQuestion)}
                    onRemoveQuestion={() => removeQuestion(qIndex)}
                    onConvertType={(type) => convertQuestionType(qIndex, type)}
                    onAddAnswer={() => addAnswer(qIndex)}
                    onRemoveAnswer={(aIndex) => removeAnswer(qIndex, aIndex)}
                    onImageUpload={(file) => handleImageUpload(qIndex, file)}
                    onImageRemove={() => removeImage(qIndex)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button type="button" variant="outline" onClick={() => addQuestion()} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
            <FormMessage>{form.formState.errors.questions?.message}</FormMessage>
          </CardContent>
        </Card>

        {additionalContent}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Save Quiz' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
