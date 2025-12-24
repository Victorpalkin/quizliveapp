'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Header } from '@/components/app/header';
import { PollPreview } from '@/components/app/poll-preview';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFunctions, useUser, trackEvent } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Sparkles, Send, Save, RotateCcw, ArrowLeft, Vote } from 'lucide-react';
import Link from 'next/link';
import type { PollQuestion, PollConfig } from '@/lib/types';
import { pollActivityConverter } from '@/firebase/converters';
import { removeUndefined } from '@/lib/firestore-utils';

// Types for AI poll generation
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedPollQuestion {
  type: 'poll-single' | 'poll-multiple' | 'poll-free-text';
  text: string;
  answers?: { text: string }[];
  placeholder?: string;
  maxLength?: number;
  timeLimit?: number;
  showLiveResults?: boolean;
}

interface GeneratedPoll {
  title: string;
  description?: string;
  questions: GeneratedPollQuestion[];
  allowAnonymous?: boolean;
}

interface GeneratePollResponse {
  poll: GeneratedPoll;
  message: string;
}

export default function CreatePollWithAIPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPoll, setGeneratedPoll] = useState<GeneratedPoll | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [allowAnonymous, setAllowAnonymous] = useState(false);

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
      const generatePollWithAI = httpsCallable<
        { prompt: string; conversationHistory?: ChatMessage[]; currentPoll?: GeneratedPoll },
        GeneratePollResponse
      >(functions, 'generatePollWithAI');

      const result = await generatePollWithAI({
        prompt: prompt.trim(),
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        currentPoll: generatedPoll || undefined,
      });

      // Update conversation history
      const newHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt.trim() },
        { role: 'assistant', content: result.data.message },
      ];
      setConversationHistory(newHistory);

      // Update poll and message
      setGeneratedPoll(result.data.poll);
      setAiMessage(result.data.message);
      setPrompt('');

      // Track AI poll generation
      trackEvent('ai_poll_generated', {
        question_count: result.data.poll.questions.length,
        is_refinement: conversationHistory.length > 0,
      });

      toast({
        title: 'Poll Generated!',
        description: result.data.message,
      });
    } catch (error: unknown) {
      console.error('Error generating poll:', error);

      let errorMessage = 'Failed to generate poll. Please try again.';
      if (error instanceof Error) {
        const functionError = error as { code?: string; message?: string };
        if (functionError.code === 'unauthenticated') {
          errorMessage = 'You must be signed in to generate polls.';
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

  const handleSavePoll = async () => {
    if (!generatedPoll || !user || !firestore) return;

    setIsSaving(true);

    try {
      // Convert AI-generated questions to PollQuestion format
      const questions: PollQuestion[] = generatedPoll.questions.map((q) => {
        const id = crypto.randomUUID();

        if (q.type === 'poll-free-text') {
          return {
            id,
            type: 'poll-free-text' as const,
            text: q.text,
            placeholder: q.placeholder || 'Share your thoughts...',
            maxLength: q.maxLength || 500,
            showLiveResults: q.showLiveResults !== false,
          };
        } else if (q.type === 'poll-multiple') {
          return {
            id,
            type: 'poll-multiple' as const,
            text: q.text,
            answers: q.answers?.map(a => ({ text: a.text })) || [],
            showLiveResults: q.showLiveResults !== false,
          };
        } else {
          return {
            id,
            type: 'poll-single' as const,
            text: q.text,
            answers: q.answers?.map(a => ({ text: a.text })) || [],
            showLiveResults: q.showLiveResults !== false,
          };
        }
      });

      const config: PollConfig = {
        allowAnonymous,
        defaultShowLiveResults: true,
      };

      const activityData = {
        type: 'poll' as const,
        title: generatedPoll.title,
        description: generatedPoll.description || '',
        hostId: user.uid,
        questions,
        config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        generatedWithAI: true,
      };

      // Remove undefined values
      const cleanedData = removeUndefined(activityData);

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(pollActivityConverter),
        cleanedData as any
      );

      // Track AI poll saved
      trackEvent('ai_poll_saved', {
        question_count: generatedPoll.questions.length,
      });

      toast({
        title: 'Poll Saved!',
        description: 'Your AI-generated poll has been saved.',
      });

      router.push(`/host/poll/${docRef.id}`);
    } catch (error) {
      console.error('Error saving poll:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the poll. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGeneratedPoll(null);
    setConversationHistory([]);
    setAiMessage('');
    setPrompt('');
    setAllowAnonymous(false);
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
    return <FullPageLoader />;
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
                <Sparkles className="h-8 w-8 text-teal-500" />
                Create Poll with AI
              </h1>
              <p className="text-muted-foreground mt-1">
                Describe your poll and let AI generate it for you
              </p>
            </div>
          </div>

          {generatedPoll && (
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
                onClick={handleSavePoll}
                disabled={isSaving}
                className="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 transition-all duration-300 rounded-xl font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Poll
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
                  {generatedPoll
                    ? 'Ask for changes or refinements to your poll'
                    : 'Describe the poll you want to create'}
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
                            ? 'bg-teal-500/10 ml-8'
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
                      generatedPoll
                        ? "e.g., 'Add a free text question about suggestions' or 'Make the questions shorter'"
                        : "e.g., 'Create a 5-question feedback poll about our team meeting format'"
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
                  className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 transition-all duration-300 rounded-xl font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {generatedPoll ? 'Update Poll' : 'Generate Poll'}
                    </>
                  )}
                </Button>

                {/* Example Prompts */}
                {!generatedPoll && conversationHistory.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Team satisfaction survey',
                        'Event feedback with ratings',
                        'Product feature priorities',
                        'Workshop topic preferences',
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

            {/* Settings Card (shown when poll is generated) */}
            {generatedPoll && (
              <Card className="rounded-2xl shadow-md border-card-border">
                <CardHeader>
                  <CardTitle className="text-xl">Poll Settings</CardTitle>
                  <CardDescription>
                    Configure options before saving
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="anonymous">Allow Anonymous Responses</Label>
                      <p className="text-sm text-muted-foreground">
                        Participants can respond without entering their name
                      </p>
                    </div>
                    <Switch
                      id="anonymous"
                      checked={allowAnonymous}
                      onCheckedChange={setAllowAnonymous}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Poll Preview */}
          <div>
            {generatedPoll ? (
              <Card className="rounded-2xl shadow-md border-card-border">
                <CardHeader>
                  <CardTitle className="text-xl">Generated Poll</CardTitle>
                  <CardDescription>
                    Review your poll below. You can ask AI to make changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <PollPreview
                    poll={{
                      ...generatedPoll,
                      allowAnonymous,
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-md border-card-border h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <Vote className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    No Poll Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Enter a prompt on the left to generate a poll. Describe the topic,
                    number of questions, and types of responses you want.
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
