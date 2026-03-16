'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormCard } from '@/components/app/form-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SettingToggle } from '@/components/app/setting-toggle';
import { Vote, Loader2, MessageSquare, ListChecks, AlignLeft, Save } from 'lucide-react';
import { PollQuestionCard, type QuestionFormData } from '@/components/app/poll-question-card';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import type { PollConfig, PollQuestion, PollSingleQuestion, PollMultipleQuestion, PollFreeTextQuestion } from '@/lib/types';
import { nanoid } from 'nanoid';
type QuestionType = 'poll-single' | 'poll-multiple' | 'poll-free-text';

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

export interface PollFormData {
  title: string;
  description?: string;
  config: PollConfig;
  questions: PollQuestion[];
}

interface PollFormProps {
  mode: 'create' | 'edit';
  initialData?: PollFormData;
  onSubmit: (data: PollFormData) => Promise<void>;
  isSubmitting: boolean;
}

function questionToFormData(q: PollQuestion): QuestionFormData {
  if (q.type === 'poll-free-text') {
    return {
      id: q.id || nanoid(),
      type: 'poll-free-text',
      text: q.text,
      answers: [],
      placeholder: q.placeholder,
      maxLength: q.maxLength,
      showLiveResults: q.showLiveResults,
    };
  } else {
    return {
      id: q.id || nanoid(),
      type: q.type,
      text: q.text,
      answers: q.answers.map(a => a.text),
      showLiveResults: q.showLiveResults,
    };
  }
}

export function PollForm({ mode, initialData, onSubmit, isSubmitting }: PollFormProps) {
  const { toast } = useToast();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [allowAnonymous, setAllowAnonymous] = useState(initialData?.config.allowAnonymous ?? false);
  const [defaultShowLiveResults, setDefaultShowLiveResults] = useState(initialData?.config.defaultShowLiveResults ?? true);
  const [questions, setQuestions] = useState<QuestionFormData[]>(
    initialData?.questions.map(questionToFormData) || [createEmptyQuestion('poll-single')]
  );

  // Reset form when initialData changes (e.g., when editing different poll)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setAllowAnonymous(initialData.config.allowAnonymous ?? false);
      setDefaultShowLiveResults(initialData.config.defaultShowLiveResults ?? true);
      setQuestions(initialData.questions.map(questionToFormData));
    }
  }, [initialData]);

  // Track if form has been modified
  const hasUnsavedChanges = title.trim() !== '' || description.trim() !== '' || questions.some(q => q.text.trim() !== '');
  useUnsavedChangesWarning(hasUnsavedChanges && !isSubmitting);

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for your poll.",
      });
      return;
    }

    if (!validateQuestions()) return;

    const config: PollConfig = {
      allowAnonymous,
      defaultShowLiveResults,
    };

    const apiQuestions = questions.map(convertToApiQuestion);

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      config,
      questions: apiQuestions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Poll Details Card */}
      <FormCard title="Poll Details" description="Basic information about your poll" contentClassName="space-y-6">
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

          <SettingToggle
            id="anonymous"
            label="Allow Anonymous Responses"
            description="Participants can respond without entering their name"
            checked={allowAnonymous}
            onCheckedChange={setAllowAnonymous}
            tooltip="When enabled, participants can submit responses without providing their name."
          />

          <SettingToggle
            id="liveResults"
            label="Show Live Results"
            description="Results update in real-time during the poll"
            checked={defaultShowLiveResults}
            onCheckedChange={setDefaultShowLiveResults}
            tooltip="When enabled, results update in real-time as responses come in."
          />
      </FormCard>

      {/* Questions Card */}
      <FormCard title="Questions" description="Add poll questions (single choice, multiple choice, or free text)" contentClassName="space-y-6">
          {questions.map((question, qIndex) => (
            <PollQuestionCard
              key={question.id}
              question={question}
              index={qIndex}
              questionsCount={questions.length}
              onUpdate={updateQuestion}
              onRemove={removeQuestion}
              onUpdateAnswer={updateAnswer}
              onAddAnswer={addAnswer}
              onRemoveAnswer={removeAnswer}
            />
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
      </FormCard>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || questions.length === 0}
          className="w-full py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
            </>
          ) : mode === 'create' ? (
            <>
              <Vote className="mr-2 h-5 w-5" /> Create Poll
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" /> Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
