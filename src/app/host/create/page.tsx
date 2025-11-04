
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/app/header';
import { PlusCircle, Trash2, Loader2, Save } from 'lucide-react';
import type { Question } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const answerSchema = z.object({
  text: z.string().min(1, "Answer text can't be empty."),
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text cannot be empty.'),
  answers: z.array(answerSchema).length(4, 'Each question must have exactly 4 answers.'),
  correctAnswerIndex: z.number().min(0).max(3),
});

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'A quiz must have at least one question.'),
});

type QuizFormData = z.infer<typeof quizSchema>;

export default function CreateQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
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
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const addQuestion = (text: string = '') => {
    const newQuestion: Omit<Question, 'id' | 'timeLimit'> = {
      text: text,
      answers: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
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

  const onSubmit = async (data: QuizFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "You must be signed in",
        description: "Please sign in to create a quiz.",
      });
      return;
    }
    try {
      await addDoc(collection(firestore, 'quizzes'), {
        ...data,
        hostId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: 'Quiz Saved!',
        description: 'Your new quiz has been saved to your dashboard.',
      });
      router.push(`/host`);
    } catch(error) {
        console.error("Error creating quiz: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save the quiz. Please try again.",
        });
    }
  };

  if (userLoading || !user) {
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
                <CardTitle>Create a New Quiz</CardTitle>
                <CardDescription>Fill in the details for your new quiz. You can host it from your dashboard after saving.</CardDescription>
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
                <CardDescription>Add questions and answers for your quiz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((q, qIndex) => (
                  <Card key={qIndex} className="bg-background/50">
                    <CardHeader className="flex-row items-center justify-between">
                      <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} type="button">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        placeholder="What is the capital of France?"
                        value={q.text}
                        onChange={(e) => updateQuestion(qIndex, { ...q, text: e.target.value })}
                        />
                      
                      <RadioGroup
                        value={String(q.correctAnswerIndex)}
                        onValueChange={(value) => updateQuestion(qIndex, { ...q, correctAnswerIndex: Number(value) })}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.answers.map((ans, aIndex) => (
                          <div key={aIndex} className="flex items-center space-x-2">
                             <RadioGroupItem value={String(aIndex)} id={`q${qIndex}a${aIndex}`} />
                             <Input
                              placeholder={`Answer ${aIndex + 1}`}
                              value={ans.text}
                              onChange={(e) => {
                                const newAnswers = [...q.answers];
                                newAnswers[aIndex] = { text: e.target.value };
                                updateQuestion(qIndex, { ...q, answers: newAnswers });
                              }}
                              />
                          </div>
                        ))}
                        </div>
                      </RadioGroup>
                      <FormMessage>{form.formState.errors.questions?.[qIndex]?.answers?.message}</FormMessage>
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
                Save Quiz
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

