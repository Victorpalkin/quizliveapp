
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/app/header';
import { PlusCircle, Trash2, Loader2, Save, X } from 'lucide-react';
import type { Question, Quiz } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

const answerSchema = z.object({
  text: z.string().min(1, "Answer text can't be empty."),
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text cannot be empty.'),
  answers: z.array(answerSchema).min(2, 'Each question must have at least 2 answers.').max(8, 'Each question can have at most 8 answers.'),
  correctAnswerIndex: z.number().min(0).max(7),
});

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'A quiz must have at least one question.'),
});

type QuizFormData = z.infer<typeof quizSchema>;

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  
  const quizRef = useMemoFirebase(() => doc(firestore, 'quizzes', quizId) as DocumentReference<Quiz>, [firestore, quizId]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);

  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'timeLimit'>[]>([]);
  
  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      questions: [],
    },
  });
  
  useEffect(() => {
    if (quizData) {
      form.reset({
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions,
      });
      setQuestions(quizData.questions);
    }
  }, [quizData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const addQuestion = (text: string = '') => {
    const newQuestion: Omit<Question, 'id' | 'timeLimit'> = {
      text: text,
      answers: [{ text: '' }, { text: '' }],
      correctAnswerIndex: 0,
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions);
  };

  const updateQuestion = (index: number, updatedQuestion: Omit<Question, 'id'| 'timeLimit'>) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions, { shouldValidate: true });
  };
  
  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, qIndex) => qIndex !== index);
    setQuestions(newQuestions);
    form.setValue('questions', newQuestions, { shouldValidate: true });
  };

  const addAnswer = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].answers.length < 8) {
      newQuestions[qIndex].answers.push({ text: '' });
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
    if (question.answers.length > 2) {
      question.answers.splice(aIndex, 1);
      // If the removed answer was the correct one, reset to the first answer
      if (question.correctAnswerIndex === aIndex) {
        question.correctAnswerIndex = 0;
      } else if (question.correctAnswerIndex > aIndex) {
        // If the removed answer was before the correct one, shift the correct index down
        question.correctAnswerIndex -= 1;
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

  const onSubmit = async (data: QuizFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "You must be signed in",
        description: "Please sign in to update a quiz.",
      });
      return;
    }
    
    const quizUpdateData = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    updateDoc(quizRef, quizUpdateData)
      .then(() => {
        toast({
          title: 'Quiz Updated!',
          description: 'Your quiz has been successfully updated.',
        });
        router.push(`/host`);
      })
      .catch((error) => {
        console.error("Error updating quiz: ", error);
        const permissionError = new FirestorePermissionError({
          path: quizRef.path,
          operation: 'update',
          requestResourceData: quizUpdateData
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the quiz. Please try again.",
        });
      });
  };

  if (userLoading || quizLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Edit Quiz</CardTitle>
                <CardDescription>Update the details for your quiz below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiz Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., World Capitals Trivia" {...field} />
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
                        <Textarea placeholder="A fun quiz about geography!" {...field} />
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
                <CardDescription>Edit the questions and answers for your quiz. Each question can have between 2 and 8 answers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((q, qIndex) => (
                  <Card key={qIndex} className="bg-background/50">
                    <CardHeader className="flex-row items-center justify-between">
                      <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                      {questions.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} type="button">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`questions.${qIndex}.text`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Question Text</FormLabel>
                                <FormControl>
                                    <Input placeholder="What is the capital of France?" {...field} onChange={(e) => {
                                        field.onChange(e);
                                        updateQuestion(qIndex, { ...q, text: e.target.value });
                                    }}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                      
                      <FormField
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerIndex`}
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Answers</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) => {
                                    field.onChange(Number(value));
                                    updateQuestion(qIndex, { ...q, correctAnswerIndex: Number(value) });
                                  }}
                                  value={String(field.value)}
                                  className="space-y-2"
                                >
                                {q.answers.map((ans, aIndex) => (
                                  <FormField
                                    key={aIndex}
                                    control={form.control}
                                    name={`questions.${qIndex}.answers.${aIndex}.text`}
                                    render={({ field: answerField }) => (
                                      <FormItem className="flex items-center space-x-3">
                                        <FormControl>
                                          <RadioGroupItem value={String(aIndex)} id={`q${qIndex}a${aIndex}`} />
                                        </FormControl>
                                        <Input
                                          placeholder={`Answer ${aIndex + 1}`}
                                          {...answerField}
                                          onChange={(e) => {
                                              answerField.onChange(e);
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
                              </FormControl>
                              <FormMessage />
                               {q.answers.length < 8 && (
                                  <Button type="button" variant="outline" size="sm" onClick={() => addAnswer(qIndex)}>
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add Answer
                                  </Button>
                                )}
                            </FormItem>
                          )}
                        />
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

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting || userLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
