'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { Header } from '@/components/app/header';
import { AISlidePreview } from '@/components/app/presentation/ai-slide-preview';
import { useToast } from '@/hooks/use-toast';
import { useFunctions, useUser, trackEvent } from '@/firebase';
import { usePresentationMutations } from '@/firebase/presentation';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Sparkles, Send, Save, RotateCcw, ArrowLeft, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import {
  convertAIPresentation,
  type GeneratedPresentation,
  type GeneratedPresentationSlide,
} from '@/lib/ai-presentation-converter';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratePresentationResponse {
  presentation: GeneratedPresentation;
  message: string;
}

const EXAMPLE_PROMPTS = [
  '10-slide workshop on teamwork',
  'Product launch deck with audience polls',
  'Training session on cybersecurity basics',
];

const SUPPORTED_FILE_TYPES = ['.txt', '.md'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export default function CreatePresentationWithAIPage() {
  const router = useRouter();
  const { toast } = useToast();
  const functions = useFunctions();
  const { user, loading: userLoading } = useUser();
  const { createPresentation, updatePresentation } = usePresentationMutations();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPresentation | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedContent, setAttachedContent] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FILE_TYPES.includes(ext)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported File Type',
        description: 'Please upload .txt or .md files.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'File must be less than 1MB.',
      });
      return;
    }

    try {
      const content = await file.text();
      setAttachedFile(file);
      setAttachedContent(content);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Read Error',
        description: 'Could not read the file. Please try again.',
      });
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setAttachedContent(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !functions) return;

    setIsGenerating(true);

    try {
      const generatePresentationWithAI = httpsCallable<
        {
          prompt: string;
          conversationHistory?: ChatMessage[];
          currentPresentation?: GeneratedPresentation;
          attachedContent?: string;
        },
        GeneratePresentationResponse
      >(functions, 'generatePresentationWithAI');

      const result = await generatePresentationWithAI({
        prompt: prompt.trim(),
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        currentPresentation: generatedPresentation || undefined,
        attachedContent: attachedContent || undefined,
      });

      const newHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt.trim() },
        { role: 'assistant', content: result.data.message },
      ];
      setConversationHistory(newHistory);

      setGeneratedPresentation(result.data.presentation);
      setPrompt('');
      // Clear attached file after successful generation
      removeAttachedFile();

      trackEvent('ai_presentation_generated', {
        slide_count: result.data.presentation.slides.length,
        is_refinement: conversationHistory.length > 0,
        had_attachment: !!attachedContent,
      });

      toast({
        title: 'Presentation Generated!',
        description: result.data.message,
      });
    } catch (error: unknown) {
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

  const handleSave = async () => {
    if (!generatedPresentation || !user) return;

    setIsSaving(true);

    try {
      const converted = convertAIPresentation(generatedPresentation);

      const presentationId = await createPresentation(converted.title, converted.slides);

      if (converted.description) {
        await updatePresentation(presentationId, { description: converted.description });
      }

      trackEvent('ai_presentation_saved', {
        slide_count: converted.slides.length,
      });

      toast({
        title: 'Presentation Saved!',
        description: 'Redirecting to the editor...',
      });

      router.push(`/host/presentation/edit/${presentationId}`);
    } catch {
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
    setPrompt('');
    removeAttachedFile();
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
                Describe your presentation and let AI generate it for you
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
                onClick={handleSave}
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
                    Save Presentation
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

                {/* Attached File Chip */}
                {attachedFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full w-fit text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                    <button
                      onClick={removeAttachedFile}
                      className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="flex gap-3">
                  <Textarea
                    ref={textareaRef}
                    placeholder={
                      generatedPresentation
                        ? "e.g., 'Add a quiz about collaboration' or 'Make the intro more engaging'"
                        : "e.g., '10-slide workshop on teamwork with quizzes and polls'"
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                    className="flex-1 min-h-[100px] rounded-xl resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="rounded-xl shrink-0"
                    title="Attach a .txt or .md file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:scale-[1.02] transition-all duration-300 rounded-xl font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {generatedPresentation ? 'Update Presentation' : 'Generate'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Example Prompts */}
                {!generatedPresentation && conversationHistory.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example) => (
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

          {/* Right Column: Slide Preview */}
          <div>
            {generatedPresentation ? (
              <Card className="rounded-2xl shadow-md border-card-border">
                <CardHeader>
                  <CardTitle className="text-xl">{generatedPresentation.title}</CardTitle>
                  <CardDescription>
                    {generatedPresentation.slides.length} slides — review below and ask AI for changes
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <AISlidePreview slides={generatedPresentation.slides as GeneratedPresentationSlide[]} />
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
                    number of slides, and types of interactive elements you want.
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
