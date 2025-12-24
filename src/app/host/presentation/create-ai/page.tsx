'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Header } from '@/components/app/header';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useFunctions, useUser, trackEvent } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Sparkles, Send, Save, RotateCcw, ArrowLeft, Presentation, MessageSquare, BarChart3, Star, Trophy, HelpCircle, ListChecks } from 'lucide-react';
import Link from 'next/link';
import type { PresentationSlide, PresentationSlideType, Presentation as PresentationType } from '@/lib/types';
import { removeUndefined } from '@/lib/firestore-utils';
import { Badge } from '@/components/ui/badge';

// Types for AI presentation generation
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedPresentation {
  title: string;
  description?: string;
  slides: PresentationSlide[];
}

interface GeneratePresentationResponse {
  presentation: GeneratedPresentation;
  message: string;
}

// Slide type icon mapping
const slideTypeIcons: Record<PresentationSlideType, React.ReactNode> = {
  'content': <Presentation className="h-4 w-4" />,
  'quiz': <HelpCircle className="h-4 w-4" />,
  'poll': <BarChart3 className="h-4 w-4" />,
  'thoughts-collect': <MessageSquare className="h-4 w-4" />,
  'thoughts-results': <MessageSquare className="h-4 w-4" />,
  'rating-describe': <Star className="h-4 w-4" />,
  'rating-input': <Star className="h-4 w-4" />,
  'rating-results': <Star className="h-4 w-4" />,
  'rating-summary': <BarChart3 className="h-4 w-4" />,
  'leaderboard': <Trophy className="h-4 w-4" />,
};

// Slide type labels
const slideTypeLabels: Record<PresentationSlideType, string> = {
  'content': 'Content',
  'quiz': 'Quiz',
  'poll': 'Poll',
  'thoughts-collect': 'Thoughts',
  'thoughts-results': 'Word Cloud',
  'rating-describe': 'Rating Item',
  'rating-input': 'Rate',
  'rating-results': 'Rating Results',
  'rating-summary': 'Summary',
  'leaderboard': 'Leaderboard',
};

// Slide type colors
const slideTypeColors: Record<PresentationSlideType, string> = {
  'content': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'quiz': 'bg-green-500/10 text-green-600 border-green-200',
  'poll': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'thoughts-collect': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'thoughts-results': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'rating-describe': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-input': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-results': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'rating-summary': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'leaderboard': 'bg-pink-500/10 text-pink-600 border-pink-200',
};

// Slide preview component
function SlidePreviewCard({ slide, index }: { slide: PresentationSlide; index: number }) {
  const getSlideContent = () => {
    switch (slide.type) {
      case 'content':
        return slide.title || slide.description?.slice(0, 50) + '...' || 'Untitled slide';
      case 'quiz':
        return slide.question?.text || 'Quiz question';
      case 'poll':
        // Poll stores question differently
        const pollQ = slide.question as { text?: string } | undefined;
        return pollQ?.text || 'Poll question';
      case 'thoughts-collect':
        return slide.thoughtsPrompt || 'Thoughts collection';
      case 'thoughts-results':
        return 'Word Cloud Results';
      case 'rating-describe':
        return slide.ratingItem?.title || 'Rating item';
      case 'rating-input':
        return slide.ratingMetric?.question || 'Rate this item';
      case 'rating-results':
        return `Rating Results (${slide.ratingResultsMode || 'single'})`;
      case 'leaderboard':
        return slide.leaderboardTitle || 'Leaderboard';
      default:
        return 'Slide';
    }
  };

  const getSlideDetails = () => {
    switch (slide.type) {
      case 'quiz':
        // Check if question has answers (single-choice, multiple-choice types)
        const quizQuestion = slide.question;
        const answers = quizQuestion && 'answers' in quizQuestion ? quizQuestion.answers : [];
        return `${answers.length} answers`;
      case 'poll':
        const pollAnswers = (slide.question as { answers?: { text: string }[] })?.answers || [];
        return `${pollAnswers.length} options`;
      case 'thoughts-collect':
        return `Max ${slide.thoughtsMaxPerPlayer || 3} per player`;
      case 'rating-input':
        const metric = slide.ratingMetric;
        return metric ? `${metric.type} (${metric.min}-${metric.max})` : '';
      case 'leaderboard':
        return `Top ${slide.leaderboardMaxDisplay || 10}`;
      default:
        return '';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`text-xs ${slideTypeColors[slide.type]}`}>
            {slideTypeIcons[slide.type]}
            <span className="ml-1">{slideTypeLabels[slide.type]}</span>
          </Badge>
        </div>
        <p className="text-sm font-medium truncate">{getSlideContent()}</p>
        {getSlideDetails() && (
          <p className="text-xs text-muted-foreground mt-0.5">{getSlideDetails()}</p>
        )}
      </div>
    </div>
  );
}

export default function CreatePresentationWithAIPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPresentation | null>(null);
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
      const generatePresentationWithAI = httpsCallable<
        { prompt: string; conversationHistory?: ChatMessage[]; currentPresentation?: GeneratedPresentation },
        GeneratePresentationResponse
      >(functions, 'generatePresentationWithAI');

      const result = await generatePresentationWithAI({
        prompt: prompt.trim(),
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        currentPresentation: generatedPresentation || undefined,
      });

      // Update conversation history
      const newHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt.trim() },
        { role: 'assistant', content: result.data.message },
      ];
      setConversationHistory(newHistory);

      // Update presentation and message
      setGeneratedPresentation(result.data.presentation);
      setAiMessage(result.data.message);
      setPrompt('');

      // Track AI presentation generation
      trackEvent('ai_presentation_generated', {
        slide_count: result.data.presentation.slides.length,
        is_refinement: conversationHistory.length > 0,
      });

      toast({
        title: 'Presentation Generated!',
        description: result.data.message,
      });
    } catch (error: unknown) {
      console.error('Error generating presentation:', error);

      let errorMessage = 'Failed to generate presentation. Please try again.';
      if (error instanceof Error) {
        const functionError = error as { code?: string; message?: string };
        if (functionError.code === 'unauthenticated') {
          errorMessage = 'You must be signed in to generate presentations.';
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

  const handleSavePresentation = async () => {
    if (!generatedPresentation || !user || !firestore) return;

    setIsSaving(true);

    try {
      // Prepare presentation data for Firestore
      const presentationData = {
        title: generatedPresentation.title,
        description: generatedPresentation.description || '',
        slides: generatedPresentation.slides.map((slide, index) => ({
          ...slide,
          id: slide.id || crypto.randomUUID(),
          order: index,
        })),
        hostId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        generatedWithAI: true,
      };

      // Remove undefined values
      const cleanedData = removeUndefined(presentationData);

      const docRef = await addDoc(collection(firestore, 'presentations'), cleanedData);

      // Track AI presentation saved
      trackEvent('ai_presentation_saved', {
        slide_count: generatedPresentation.slides.length,
      });

      toast({
        title: 'Presentation Saved!',
        description: 'Your AI-generated presentation has been saved.',
      });

      // Redirect to editor
      router.push(`/host/presentation/edit/${docRef.id}`);
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the presentation. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGeneratedPresentation(null);
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
                <Sparkles className="h-8 w-8 text-primary" />
                Create Presentation with AI
              </h1>
              <p className="text-muted-foreground mt-1">
                Describe your presentation and let Gemini 3 Pro generate it for you
              </p>
            </div>
          </div>

          {generatedPresentation && (
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
                onClick={handleSavePresentation}
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
                    Save & Edit
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
                  {generatedPresentation
                    ? 'Ask for changes or refinements to your presentation'
                    : 'Describe the presentation you want to create'}
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
                      generatedPresentation
                        ? "e.g., 'Add a poll about team preferences' or 'Replace the quiz with more content slides'"
                        : "e.g., 'Create a workshop about effective communication with polls, quizzes, and a word cloud'"
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
                      {generatedPresentation ? 'Update Presentation' : 'Generate Presentation'}
                    </>
                  )}
                </Button>

                {/* Example Prompts */}
                {!generatedPresentation && conversationHistory.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Team workshop with polls and word cloud',
                        'Training session with pre/post quiz',
                        'Retrospective meeting with feedback',
                        'Product demo with audience Q&A',
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

          {/* Right Column: Presentation Preview */}
          <div>
            {generatedPresentation ? (
              <Card className="rounded-2xl shadow-md border-card-border">
                <CardHeader>
                  <CardTitle className="text-xl">{generatedPresentation.title}</CardTitle>
                  <CardDescription>
                    {generatedPresentation.description || `${generatedPresentation.slides.length} slides generated`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
                  {generatedPresentation.slides.map((slide, index) => (
                    <SlidePreviewCard key={slide.id || index} slide={slide} index={index} />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl shadow-md border-card-border h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center p-8">
                  <Sparkles className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    No Presentation Yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Enter a prompt on the left to generate a presentation. You can describe the topic,
                    slide types (quiz, poll, word cloud), and flow.
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
