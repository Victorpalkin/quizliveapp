
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/app/header';
import { PlusCircle, Trash2, Loader2, Save, X, ImagePlus, ImageOff } from 'lucide-react';
import type { Question, Quiz } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { nanoid } from 'nanoid';

const answerSchema = z.object({
  text: z.string().min(1, "Answer text can't be empty."),
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text cannot be empty.'),
  imageUrl: z.string().url().optional(),
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
  const storage = useStorage();
  const { user, loading: userLoading } = useUser();
  
  const quizRef = useMemoFirebase(() => doc(firestore, 'quizzes', quizId) as DocumentReference<Quiz>, [firestore, quizId]);
  const { data: quizData, loading: quizLoading } = useDoc(quizRef);

  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'timeLimit'>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const imageFiles = useRef<Record<number, File>>({});
  const imagesToDelete = useRef<string[]>([]);
  
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
      const sanitizedQuestions = quizData.questions.map(({ id, timeLimit, ...q }) => q);
      form.reset({
        title: quizData.title,
        description: quizData.description,
        questions: sanitizedQuestions,
      });
      setQuestions(sanitizedQuestions);
    }
  }, [quizData, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    return () => {
        const cleanup = async () => {
            for (const url of imagesToDelete.current) {
                if (!url.startsWith('blob:')) { // Don't try to delete local blob URLs from storage
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
      if (question.correctAnswerIndex === aIndex) {
        question.correctAnswerIndex = 0;
      } else if (question.correctAnswerIndex > aIndex) {
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

  const handleImageUpload = async (qIndex: number, file: File) => {
    if (!user) return;
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

  const onSubmit = async (data: QuizFormData) => {
    if (!user) {
      toast({ variant: "destructive", title: "You must be signed in" });
      return;
    }
    setIsSubmitting(true);

    try {
        const quizDataForUpload = { ...data, questions: [...data.questions] };

        // Upload new/updated images
        for (const qIndexStr in imageFiles.current) {
            const qIndex = parseInt(qIndexStr, 10);
            const file = imageFiles.current[qIndex];
            if (file) {
                const imageRef = ref(storage, `quiz-images/${user.uid}/${nanoid()}`);
                await uploadBytes(imageRef, file);
                const downloadURL = await getDownloadURL(imageRef);
                quizDataForUpload.questions[qIndex].imageUrl = downloadURL;
            }
        }
        
        // Final update data for Firestore
        const finalQuizUpdate = {
            ...quizDataForUpload,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(quizRef, finalQuizUpdate);
        
        // Clean up images marked for deletion from storage
        for (const url of imagesToDelete.current) {
            if (!url.startsWith('blob:')) {
                try {
                    const imageRef = ref(storage, url);
                    await deleteObject(imageRef);
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Failed to delete image:", error);
                    }
                }
            }
        }
        imagesToDelete.current = [];

        toast({
          title: 'Quiz Updated!',
          description: 'Your quiz has been successfully updated.',
        });
        router.push(`/host`);
    } catch (error) {
        console.error("Error updating quiz: ", error);
        const permissionError = new FirestorePermissionError({
          path: quizRef.path,
          operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the quiz. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
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
                    <CardHeader className="flex-row items-start justify-between">
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
                      
                       <FormItem>
                            <FormLabel>Image (Optional)</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-4">
                                {q.imageUrl ? (
                                    <div className="relative w-32 h-20 rounded-md overflow-hidden">
                                        <Image src={q.imageUrl} alt={`Preview for question ${qIndex + 1}`} layout="fill" objectFit="cover" />
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
              <Button type="submit" size="lg" disabled={isSubmitting || userLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
