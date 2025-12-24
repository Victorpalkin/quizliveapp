'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/app/header';
import { Vote, ArrowLeft, Loader2, Plus, Trash2, GripVertical, MessageSquare, ListChecks, AlignLeft } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import Link from 'next/link';
import type { PollConfig, PollQuestion, PollSingleQuestion, PollMultipleQuestion, PollFreeTextQuestion } from '@/lib/types';
import { pollActivityConverter } from '@/firebase/converters';
import { FeatureTooltip } from '@/components/ui/feature-tooltip';
import { nanoid } from 'nanoid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type QuestionType = 'poll-single' | 'poll-multiple' | 'poll-free-text';

interface QuestionFormData {
  id: string;
  type: QuestionType;
  text: string;
  answers: string[];
  placeholder?: string;
  maxLength?: number;
  showLiveResults?: boolean;
}

function createEmptyQuestion(type: QuestionType): QuestionFormData {
  return {
    id: nanoid(),
    type,
    text: '',
    answers: type === 'poll-free-text' ? [] : ['', ''],
    placeholder: type === 'poll-free-text' ? 'Share your thoughts...' : undefined,
    maxLength: type === 'poll-free-text' ? 500 : undefined,
    showLiveResults: true,
  };
}

export default function CreatePollPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [defaultShowLiveResults, setDefaultShowLiveResults] = useState(true);
  const [questions, setQuestions] = useState<QuestionFormData[]>([createEmptyQuestion('poll-single')]);
  const [isCreating, setIsCreating] = useState(false);

  // Track if form has been modified
  const hasUnsavedChanges = title.trim() !== '' || description.trim() !== '' || questions.some(q => q.text.trim() !== '');
  useUnsavedChangesWarning(hasUnsavedChanges && !isCreating);

  const addQuestion = (type: QuestionType) => {
    setQuestions([...questions, createEmptyQuestion(type)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, updates: Partial<QuestionFormData>) => {
    setQuestions(questions.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const updateAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex) return q;
      const newAnswers = [...q.answers];
      newAnswers[answerIndex] = value;
      return { ...q, answers: newAnswers };
    }));
  };

  const addAnswer = (questionIndex: number) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex || q.answers.length >= 6) return q;
      return { ...q, answers: [...q.answers, ''] };
    }));
  };

  const removeAnswer = (questionIndex: number, answerIndex: number) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex || q.answers.length <= 2) return q;
      return { ...q, answers: q.answers.filter((_, ai) => ai !== answerIndex) };
    }));
  };

  const convertToApiQuestion = (q: QuestionFormData): PollQuestion => {
    if (q.type === 'poll-free-text') {
      return {
        id: q.id,
        type: 'poll-free-text',
        text: q.text.trim(),
        placeholder: q.placeholder,
        maxLength: q.maxLength,
        showLiveResults: q.showLiveResults,
      } as PollFreeTextQuestion;
    } else if (q.type === 'poll-multiple') {
      return {
        id: q.id,
        type: 'poll-multiple',
        text: q.text.trim(),
        answers: q.answers.filter(a => a.trim()).map(a => ({ text: a.trim() })),
        showLiveResults: q.showLiveResults,
      } as PollMultipleQuestion;
    } else {
      return {
        id: q.id,
        type: 'poll-single',
        text: q.text.trim(),
        answers: q.answers.filter(a => a.trim()).map(a => ({ text: a.trim() })),
        showLiveResults: q.showLiveResults,
      } as PollSingleQuestion;
    }
  };

  const validateQuestions = (): boolean => {
    for (const q of questions) {
      if (!q.text.trim()) {
        toast({
          variant: "destructive",
          title: "Question text required",
          description: "Please enter text for all questions.",
        });
        return false;
      }
      if (q.type !== 'poll-free-text') {
        const validAnswers = q.answers.filter(a => a.trim());
        if (validAnswers.length < 2) {
          toast({
            variant: "destructive",
            title: "At least 2 answers required",
            description: "Each choice question needs at least 2 answer options.",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to create a poll.",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for your poll.",
      });
      return;
    }

    if (!validateQuestions()) return;

    setIsCreating(true);

    try {
      const config: PollConfig = {
        allowAnonymous,
        defaultShowLiveResults,
      };

      const apiQuestions = questions.map(convertToApiQuestion);

      const activityData = {
        type: 'poll' as const,
        title: title.trim(),
        description: description.trim() || undefined,
        hostId: user.uid,
        questions: apiQuestions,
        config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(firestore, 'activities').withConverter(pollActivityConverter),
        activityData as any
      );

      toast({
        title: 'Poll Created!',
        description: 'You can now launch a session.',
      });

      router.push(`/host/poll/${docRef.id}`);
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the poll. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case 'poll-single': return <MessageSquare className="h-4 w-4" />;
      case 'poll-multiple': return <ListChecks className="h-4 w-4" />;
      case 'poll-free-text': return <AlignLeft className="h-4 w-4" />;
    }
  };

  const getQuestionTypeName = (type: QuestionType) => {
    switch (type) {
      case 'poll-single': return 'Single Choice';
      case 'poll-multiple': return 'Multiple Choice';
      case 'poll-free-text': return 'Free Text';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/host">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Vote className="h-10 w-10 text-teal-500" />
            <div>
              <h1 className="text-4xl font-bold">Create Poll</h1>
              <p className="text-muted-foreground">Gather opinions from your audience</p>
            </div>
          </div>
        </div>

        {/* Poll Details Card */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-6">
          <CardHeader>
            <CardTitle>Poll Details</CardTitle>
            <CardDescription>
              Basic information about your poll
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Feedback, Session Preferences"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this poll..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="anonymous">Allow Anonymous Responses</Label>
                  <FeatureTooltip
                    content="When enabled, participants can submit responses without providing their name."
                    icon="info"
                  />
                </div>
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

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="liveResults">Show Live Results</Label>
                  <FeatureTooltip
                    content="When enabled, results update in real-time as responses come in."
                    icon="info"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Results update in real-time during the poll
                </p>
              </div>
              <Switch
                id="liveResults"
                checked={defaultShowLiveResults}
                onCheckedChange={setDefaultShowLiveResults}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions Card */}
        <Card className="shadow-lg rounded-2xl border border-card-border mb-6">
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Add poll questions (single choice, multiple choice, or free text)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="border rounded-xl p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Question {qIndex + 1}</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-background rounded-md text-xs">
                      {getQuestionIcon(question.type)}
                      <span>{getQuestionTypeName(question.type)}</span>
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(qIndex)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value: QuestionType) => updateQuestion(qIndex, {
                      type: value,
                      answers: value === 'poll-free-text' ? [] : (question.answers.length > 0 ? question.answers : ['', '']),
                      placeholder: value === 'poll-free-text' ? 'Share your thoughts...' : undefined,
                      maxLength: value === 'poll-free-text' ? 500 : undefined,
                    })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poll-single">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Single Choice
                        </div>
                      </SelectItem>
                      <SelectItem value="poll-multiple">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          Multiple Choice
                        </div>
                      </SelectItem>
                      <SelectItem value="poll-free-text">
                        <div className="flex items-center gap-2">
                          <AlignLeft className="h-4 w-4" />
                          Free Text
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    placeholder="Enter your question..."
                    rows={2}
                  />
                </div>

                {question.type !== 'poll-free-text' && (
                  <div className="space-y-3">
                    <Label>Answer Options</Label>
                    {question.answers.map((answer, aIndex) => (
                      <div key={aIndex} className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-muted rounded-full text-xs font-medium">
                          {String.fromCharCode(65 + aIndex)}
                        </span>
                        <Input
                          value={answer}
                          onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                          placeholder={`Option ${aIndex + 1}`}
                          className="flex-1"
                        />
                        {question.answers.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAnswer(qIndex, aIndex)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {question.answers.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addAnswer(qIndex)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Option
                      </Button>
                    )}
                  </div>
                )}

                {question.type === 'poll-free-text' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Placeholder Text</Label>
                      <Input
                        value={question.placeholder || ''}
                        onChange={(e) => updateQuestion(qIndex, { placeholder: e.target.value })}
                        placeholder="e.g., Share your thoughts..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Characters</Label>
                      <Input
                        type="number"
                        min={50}
                        max={2000}
                        value={question.maxLength || 500}
                        onChange={(e) => updateQuestion(qIndex, { maxLength: parseInt(e.target.value) || 500 })}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => addQuestion('poll-single')}>
                <MessageSquare className="h-4 w-4 mr-2" /> Add Single Choice
              </Button>
              <Button variant="outline" onClick={() => addQuestion('poll-multiple')}>
                <ListChecks className="h-4 w-4 mr-2" /> Add Multiple Choice
              </Button>
              <Button variant="outline" onClick={() => addQuestion('poll-free-text')}>
                <AlignLeft className="h-4 w-4 mr-2" /> Add Free Text
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="pt-4">
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || questions.length === 0}
            className="w-full py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 rounded-xl"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Vote className="mr-2 h-5 w-5" /> Create Poll
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
