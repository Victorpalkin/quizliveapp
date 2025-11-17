'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Save, X, ImagePlus, ImageOff } from 'lucide-react';
import type { Question, SingleChoiceQuestion, MultipleChoiceQuestion, SliderQuestion, SlideQuestion } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
  timeLimit: z.number().optional(),
});

// Slide question schema - informational only
const slideQuestionSchema = z.object({
  type: z.literal('slide'),
  text: z.string().min(1, 'Slide title cannot be empty.'),
  title: z.string().min(1, 'Slide title cannot be empty.'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  timeLimit: z.number().optional(),
});

// Discriminated union for question types
const questionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  sliderQuestionSchema,
  slideQuestionSchema,
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
  const { toast } = useToast();
  const storage = useStorage();
  const [questions, setQuestions] = useState<(SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion)[]>([]);

  const imageFiles = useRef<Record<number, File>>({});
  const imagesToDelete = useRef<string[]>([]);

  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      questions: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      setQuestions(initialData.questions as (SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion)[]);
    } else if (questions.length === 0) {
      addQuestion();
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        for (const url of imagesToDelete.current) {
          if (!url.startsWith('blob:')) {
            try {
              const imageRef = ref(storage, url);
              await deleteObject(imageRef);
            } catch (error) {
              console.error("Failed to delete image during cleanup:", error);
            }
          }
        }
      }
      cleanup();
    }
  }, [storage]);

  const addQuestion = (text: string = '', type: 'single-choice' | 'multiple-choice' | 'slider' | 'slide' = 'single-choice') => {
    let newQuestion: SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion;

    if (type === 'slide') {
      newQuestion = {
        type: 'slide',
        text: text || 'New Slide',
        title: text || 'New Slide',
        description: '',
        timeLimit: 10,
      };
    } else if (type === 'slider') {
      newQuestion = {
        type: 'slider',
        text: text,
        minValue: 0,
        maxValue: 100,
        correctValue: 50,
        step: 1,
        unit: '',
        timeLimit: 20,
      };
    } else if (type === 'multiple-choice') {
      newQuestion = {
        type: 'multiple-choice',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        correctAnswerIndices: [0, 1],
        timeLimit: 20,
        showAnswerCount: true,
      };
    } else {
      newQuestion = {
        type: 'single-choice',
        text: text,
        answers: [{ text: '' }, { text: '' }],
        correctAnswerIndex: 0,
        timeLimit: 20,
      };
    }

    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions);
  };

  const updateQuestion = (index: number, updatedQuestion: SingleChoiceQuestion | MultipleChoiceQuestion | SliderQuestion | SlideQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions, { shouldValidate: true });
  };

  const removeQuestion = (index: number) => {
    const questionToRemove = questions[index];
    if (questionToRemove.imageUrl) {
      imagesToDelete.current.push(questionToRemove.imageUrl);
    }
    const newQuestions = questions.filter((_, qIndex) => qIndex !== index);
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions, { shouldValidate: true });
  };

  const addAnswer = (qIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    if (question.type !== 'single-choice' && question.type !== 'multiple-choice') return;

    if (question.answers.length < 8) {
      question.answers.push({ text: '' });
      setQuestions(newQuestions);
      form.setValue('questions', newQuestions, { shouldValidate: true });
    } else {
      toast({
        variant: "destructive",
        title: "Answer limit reached",
        description: "You can only have a maximum of 8 answers per question.",
      });
    }
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];

    if (question.type !== 'single-choice' && question.type !== 'multiple-choice') return;

    if (question.answers.length > 2) {
      question.answers.splice(aIndex, 1);

      if (question.type === 'single-choice') {
        // Adjust correctAnswerIndex
        if (question.correctAnswerIndex === aIndex) {
          question.correctAnswerIndex = 0; // Default to first answer
        } else if (question.correctAnswerIndex > aIndex) {
          question.correctAnswerIndex -= 1;
        }
      } else {
        // Adjust correctAnswerIndices
        const newCorrectIndices = question.correctAnswerIndices
          .filter(i => i !== aIndex)
          .map(i => i > aIndex ? i - 1 : i);
        if (newCorrectIndices.length < 2) {
          // Ensure at least 2 correct answers for multiple-choice
          newCorrectIndices.push(...[0, 1].filter(i => !newCorrectIndices.includes(i) && i < question.answers.length - 1));
        }
        question.correctAnswerIndices = newCorrectIndices;
      }

      setQuestions(newQuestions);
      form.setValue('questions', newQuestions, { shouldValidate: true });
    } else {
      toast({
        variant: "destructive",
        title: "Answer limit reached",
        description: "You must have at least 2 answers per question.",
      });
    }
  };

  const handleImageUpload = async (qIndex: number, file: File) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 5MB. Please choose a smaller file.",
      });
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only PNG, JPEG, and GIF images are allowed.",
      });
      return;
    }

    const question = questions[qIndex];

    if (question.imageUrl) {
      imagesToDelete.current.push(question.imageUrl);
    }

    imageFiles.current[qIndex] = file;
    const newImageUrl = URL.createObjectURL(file);
    updateQuestion(qIndex, { ...question, imageUrl: newImageUrl });
  };

  const removeImage = (qIndex: number) => {
    const question = questions[qIndex];
    if (question.imageUrl) {
      if (question.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        imagesToDelete.current.push(question.imageUrl);
      } else {
        URL.revokeObjectURL(question.imageUrl);
      }
      delete imageFiles.current[qIndex];
      updateQuestion(qIndex, { ...question, imageUrl: undefined });
    }
  };

  const handleSubmit = async (data: QuizFormData) => {
    await onSubmit(data, imageFiles.current, imagesToDelete.current);
    imagesToDelete.current = [];
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
            {questions.map((q, qIndex) => (
              <Card key={qIndex} className="bg-background/50">
                <CardHeader className="flex-row items-start justify-between">
                  <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} type="button">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Type Selector */}
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <RadioGroup
                      value={q.type}
                      onValueChange={(value: 'single-choice' | 'multiple-choice' | 'slider' | 'slide') => {
                        if (value === q.type) return;

                        // Convert to slide
                        if (value === 'slide') {
                          const slideQ: SlideQuestion = {
                            type: 'slide',
                            text: q.text || 'New Slide',
                            title: q.text || 'New Slide',
                            description: '',
                            timeLimit: q.timeLimit || 10,
                            imageUrl: q.imageUrl,
                          };
                          updateQuestion(qIndex, slideQ);
                        }
                        // Convert to slider
                        else if (value === 'slider') {
                          const sliderQ: SliderQuestion = {
                            type: 'slider',
                            text: q.text,
                            minValue: 0,
                            maxValue: 100,
                            correctValue: 50,
                            step: 1,
                            unit: '',
                            timeLimit: q.timeLimit || 20,
                            imageUrl: q.imageUrl,
                          };
                          updateQuestion(qIndex, sliderQ);
                        }
                        // Convert to single-choice
                        else if (value === 'single-choice') {
                          const answers = (q.type === 'slider' || q.type === 'slide') ? [{ text: '' }, { text: '' }] : (q as SingleChoiceQuestion | MultipleChoiceQuestion).answers;
                          const scQ: SingleChoiceQuestion = {
                            type: 'single-choice',
                            text: q.text,
                            answers: answers,
                            correctAnswerIndex: 0,
                            timeLimit: q.timeLimit || 20,
                            imageUrl: q.imageUrl,
                          };
                          updateQuestion(qIndex, scQ);
                        }
                        // Convert to multiple-choice
                        else if (value === 'multiple-choice') {
                          const answers = (q.type === 'slider' || q.type === 'slide') ? [{ text: '' }, { text: '' }] : (q as SingleChoiceQuestion | MultipleChoiceQuestion).answers;
                          const mcQ: MultipleChoiceQuestion = {
                            type: 'multiple-choice',
                            text: q.text,
                            answers: answers,
                            correctAnswerIndices: [0, 1],
                            timeLimit: q.timeLimit || 20,
                            showAnswerCount: true,
                            imageUrl: q.imageUrl,
                          };
                          updateQuestion(qIndex, mcQ);
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single-choice" id={`type-sc-${qIndex}`} />
                        <Label htmlFor={`type-sc-${qIndex}`}>Single Choice</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple-choice" id={`type-mc-${qIndex}`} />
                        <Label htmlFor={`type-mc-${qIndex}`}>Multiple Choice</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="slider" id={`type-slider-${qIndex}`} />
                        <Label htmlFor={`type-slider-${qIndex}`}>Slider (Numeric)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="slide" id={`type-slide-${qIndex}`} />
                        <Label htmlFor={`type-slide-${qIndex}`}>Slide (Info)</Label>
                      </div>
                    </RadioGroup>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name={`questions.${qIndex}.text`}
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
                              updateQuestion(qIndex, { ...q, text: e.target.value });
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem>
                      <FormLabel>Image (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          {q.imageUrl ? (
                            <div className="relative w-32 h-20 rounded-md overflow-hidden">
                              <Image src={q.imageUrl} alt={`Preview for question ${qIndex + 1}`} fill style={{ objectFit: 'cover' }} />
                              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={() => removeImage(qIndex)} type="button">
                                <ImageOff className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-md hover:bg-muted">
                              <ImagePlus className="h-8 w-8 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/gif"
                                onChange={(e) => e.target.files && handleImageUpload(qIndex, e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>
                      </FormControl>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name={`questions.${qIndex}.timeLimit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Limit</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const time = parseInt(value, 10);
                              field.onChange(time);
                              updateQuestion(qIndex, { ...q, timeLimit: time });
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

                  {/* Multiple Choice Configuration */}
                  {q.type === 'multiple-choice' && (
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
                            checked={q.showAnswerCount !== false}
                            onCheckedChange={(checked) => {
                              updateQuestion(qIndex, { ...q, showAnswerCount: !!checked });
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    </div>
                  )}

                  {/* Single Choice Question Configuration */}
                  {q.type === 'single-choice' && (
                    <FormField
                      control={form.control}
                      name={`questions.${qIndex}.correctAnswerIndex`}
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Answers</FormLabel>
                            <p className="text-sm text-muted-foreground">Select one correct answer.</p>
                          </div>
                          <RadioGroup
                            value={String(q.correctAnswerIndex)}
                            onValueChange={(value) => {
                              updateQuestion(qIndex, { ...q, correctAnswerIndex: parseInt(value, 10) });
                            }}
                          >
                            {q.answers.map((ans, aIndex) => (
                              <FormField
                                key={aIndex}
                                control={form.control}
                                name={`questions.${qIndex}.answers.${aIndex}.text`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={String(aIndex)} />
                                    </FormControl>
                                    <Input
                                      {...field}
                                      placeholder={`Answer ${aIndex + 1}`}
                                      maxLength={200}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        const newAnswers = [...q.answers];
                                        newAnswers[aIndex] = { text: e.target.value };
                                        updateQuestion(qIndex, { ...q, answers: newAnswers });
                                      }}
                                    />
                                    {q.answers.length > 2 && (
                                      <Button variant="ghost" size="icon" onClick={() => removeAnswer(qIndex, aIndex)} type="button">
                                        <X className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    )}
                                  </FormItem>
                                )}
                              />
                            ))}
                          </RadioGroup>
                          <FormMessage>{form.formState.errors.questions?.[qIndex]?.correctAnswerIndex?.message}</FormMessage>
                          {q.answers.length < 8 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-2">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Answer
                            </Button>
                          )}
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Multiple Choice Question Configuration */}
                  {q.type === 'multiple-choice' && (
                    <FormField
                      control={form.control}
                      name={`questions.${qIndex}.correctAnswerIndices`}
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Answers</FormLabel>
                            <p className="text-sm text-muted-foreground">Select at least 2 correct answers.</p>
                          </div>
                          {q.answers.map((ans, aIndex) => (
                            <FormField
                              key={aIndex}
                              control={form.control}
                              name={`questions.${qIndex}.answers.${aIndex}.text`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={q.correctAnswerIndices.includes(aIndex)}
                                      onCheckedChange={(checked) => {
                                        let newCorrectIndices: number[];
                                        if (checked) {
                                          newCorrectIndices = [...q.correctAnswerIndices, aIndex].sort();
                                        } else {
                                          newCorrectIndices = q.correctAnswerIndices.filter((i) => i !== aIndex);
                                        }
                                        if (newCorrectIndices.length < 2) {
                                          toast({ variant: 'destructive', title: "You must have at least 2 correct answers for multiple choice questions." });
                                          return;
                                        }
                                        updateQuestion(qIndex, { ...q, correctAnswerIndices: newCorrectIndices });
                                      }}
                                    />
                                  </FormControl>
                                  <Input
                                    {...field}
                                    placeholder={`Answer ${aIndex + 1}`}
                                    maxLength={200}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      const newAnswers = [...q.answers];
                                      newAnswers[aIndex] = { text: e.target.value };
                                      updateQuestion(qIndex, { ...q, answers: newAnswers });
                                    }}
                                  />
                                  {q.answers.length > 2 && (
                                    <Button variant="ghost" size="icon" onClick={() => removeAnswer(qIndex, aIndex)} type="button">
                                      <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  )}
                                </FormItem>
                              )}
                            />
                          ))}
                          <FormMessage>{form.formState.errors.questions?.[qIndex]?.correctAnswerIndices?.message}</FormMessage>
                          {q.answers.length < 8 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => addAnswer(qIndex)} className="mt-2">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Answer
                            </Button>
                          )}
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Slider Question Configuration */}
                  {q.type === 'slider' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormItem>
                          <FormLabel>Minimum Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={q.minValue}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateQuestion(qIndex, { ...q, minValue: val });
                              }}
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel>Maximum Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={q.maxValue}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateQuestion(qIndex, { ...q, maxValue: val });
                              }}
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel>Correct Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={q.correctValue}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateQuestion(qIndex, { ...q, correctValue: val });
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormItem>
                          <FormLabel>Decimal Precision</FormLabel>
                          <Select
                            value={String(q.step || 1)}
                            onValueChange={(value) => {
                              const step = parseFloat(value);
                              updateQuestion(qIndex, { ...q, step });
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">Whole numbers (1)</SelectItem>
                              <SelectItem value="0.1">1 decimal (0.1)</SelectItem>
                              <SelectItem value="0.01">2 decimals (0.01)</SelectItem>
                              <SelectItem value="0.001">3 decimals (0.001)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                        <FormItem>
                          <FormLabel>Unit (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., kg, %, °C"
                              value={q.unit || ''}
                              onChange={(e) => {
                                updateQuestion(qIndex, { ...q, unit: e.target.value });
                              }}
                              maxLength={10}
                            />
                          </FormControl>
                        </FormItem>
                      </div>
                    </div>
                  )}

                  {/* Slide Question Configuration */}
                  {q.type === 'slide' && (
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <FormLabel>Slide Content</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Informational slide - no answer required
                        </p>
                      </div>
                      <FormItem>
                        <FormLabel>Slide Title</FormLabel>
                        <FormControl>
                          <Input
                            value={q.title}
                            onChange={(e) => {
                              updateQuestion(qIndex, { ...q, title: e.target.value, text: e.target.value });
                            }}
                            placeholder="Enter slide title"
                            maxLength={200}
                          />
                        </FormControl>
                      </FormItem>
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            value={q.description || ''}
                            onChange={(e) => {
                              updateQuestion(qIndex, { ...q, description: e.target.value });
                            }}
                            placeholder="Enter slide description or additional information"
                            maxLength={1000}
                            rows={4}
                          />
                        </FormControl>
                      </FormItem>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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
