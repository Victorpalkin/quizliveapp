'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/app/header';
import { QuizPreview } from '@/components/app/quiz-preview';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFunctions, useUser, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Sparkles, Send, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Quiz, Question } from '@/lib/types';

// Types for AI quiz generation
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Question[];
}

interface GenerateQuizResponse {
  quiz: GeneratedQuiz;
  message: string;
}

// Helper function to remove undefined values from objects
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export default function CreateQuizWithAIPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [aiMessage, setAiMessage] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !functions) return;

    setIsGenerating(true);

    try {
      const generateQuizWithAI = httpsCallable<
        { prompt: string; conversationHistory?: ChatMessage[]; currentQuiz?: GeneratedQuiz },
        GenerateQuizResponse
      >(functions, 'generateQuizWithAI');

      const result = await generateQuizWithAI({
        prompt: prompt.trim(),
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        currentQuiz: generatedQuiz || undefined,
      });

      // Update conversation history
      const newHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt.trim() },
        { role: 'assistant', content: result.data.message },
      ];
      setConversationHistory(newHistory);

      // Update quiz and message
      setGeneratedQuiz(result.data.quiz);
      setAiMessage(result.data.message);
      setPrompt('');

      toast({
        title: 'Quiz Generated!',
        description: result.data.message,
      });
    } catch (error: unknown) {
      console.error('Error generating quiz:', error);

      let errorMessage = 'Failed to generate quiz. Please try again.';
      if (error instanceof Error) {
        // Check for specific error codes from Cloud Functions
        const functionError = error as { code?: string; message?: string };
        if (functionError.code === 'unauthenticated') {
          errorMessage = 'You must be signed in to generate quizzes.';
        } else if (functionError.code === 'resource-exhausted') {
          errorMessage = 'AI quota exceeded. Please try again later.';
        } else if (functionError.code === 'invalid-argument') {
          errorMessage = functionError.message || 'Invalid prompt. Please try a different one.';
        }
      }

      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!generatedQuiz || !user || !firestore) return;

    setIsSaving(true);

    try {
      // Prepare quiz data for Firestore
      const quizData = {
        title: generatedQuiz.title,
        description: generatedQuiz.description || '',
        questions: generatedQuiz.questions.map((q) => {
          // Ensure each question has an id
          return { ...q, id: crypto.randomUUID() };
        }),
        hostId: user.uid,
        createdAt: serverTimestamp(),
        generatedWithAI: true,
      };

      // Remove undefined values
      const cleanedQuizData = removeUndefined(quizData);

      await addDoc(collection(firestore, 'quizzes'), cleanedQuizData);

      toast({
        title: 'Quiz Saved!',
        description: 'Your AI-generated quiz has been saved to your dashboard.',
      });

      router.push('/host');
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the quiz. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGeneratedQuiz(null);
    setConversationHistory([]);
    setAiMessage('');
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        handleGenerate();
      }
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link href="/host">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-semibold flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                Create Quiz with AI
              </h1>
              <p className="text-muted-foreground mt-1">
                Describe your quiz and let Gemini 3 Pro generate it for you
              </p>
            </div>
          </div>

          {generatedQuiz && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-xl"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
              <Button
                onClick={handleSaveQuiz}
                disabled={isSaving}
                className="px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Quiz
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Chat Interface */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-md border-card-border">
              <CardHeader>
                <CardTitle className="text-xl">Chat with AI</CardTitle>
                <CardDescription>
                  {generatedQuiz
                    ? 'Ask for changes or refinements to your quiz'
                    : 'Describe the quiz you want to create'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto p-2">
                    {conversationHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className="flex gap-3">
                  <Textarea
                    ref={textareaRef}
                    placeholder={
                      generatedQuiz
                        ? "e.g., 'Make the questions harder' or 'Add 2 more questions about history'"
                        : "e.g., 'Create a 10-question quiz about European capitals with medium difficulty'"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                    className="flex-1 min-h-[100px] rounded-xl resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {generatedQuiz ? 'Update Quiz' : 'Generate Quiz'}
                    </>
                  )}
                </Button>

                {/* Example Prompts */}
                {!generatedQuiz && conversationHistory.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '10 questions about space exploration',
                        'Easy quiz about animals for kids',
                        '5 hard math questions with sliders',
                        'World War II trivia mix',
                      ].map((example) => (
                        <Button
                          key={example}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-full"
                          onClick={() => setPrompt(example)}
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Quiz Preview */}
          <div>
            {generatedQuiz ? (
              <Card className="rounded-2xl shadow-md border-card-border">
                <CardHeader>
                  <CardTitle className="text-xl">Generated Quiz</CardTitle>
                  <CardDescription>
                    Review your quiz below. You can ask AI to make changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <QuizPreview
                    quiz={{
                      id: 'preview',
                      hostId: user.uid,
                      ...generatedQuiz,
                    } as Quiz}
                    showCorrectAnswers={true}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-md border-card-border h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <Sparkles className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    No Quiz Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Enter a prompt on the left to generate a quiz. You can describe the topic,
                    difficulty, number of questions, and question types.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
