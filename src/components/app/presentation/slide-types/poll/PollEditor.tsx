'use client';

import { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { PollSingleQuestion, PollMultipleQuestion, Answer } from '@/lib/types';

const TIME_LIMITS = [10, 20, 30, 60];

type PollQuestion = PollSingleQuestion | PollMultipleQuestion;

export function PollEditor({ slide, onSlideChange }: SlideEditorProps) {
  const question = slide.question as PollQuestion | undefined;
  const answers = question?.answers || [];
  const isMultiple = question?.type === 'poll-multiple';

  const updateQuestion = useCallback((updates: Partial<PollQuestion>) => {
    const currentType = question?.type || 'poll-single';
    const currentQuestion = {
      type: currentType,
      text: question?.text || '',
      answers: question?.answers || [
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
      ],
      timeLimit: question?.timeLimit || 30,
      ...updates,
    } as PollQuestion;
    onSlideChange({ ...slide, question: currentQuestion });
  }, [slide, question, onSlideChange]);

  const handleQuestionTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateQuestion({ text: e.target.value });
  }, [updateQuestion]);

  const handleAnswerChange = useCallback((index: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], text };
    updateQuestion({ answers: newAnswers });
  }, [answers, updateQuestion]);

  const handleAddAnswer = useCallback(() => {
    if (answers.length >= 6) return;
    updateQuestion({ answers: [...answers, { text: '' }] });
  }, [answers, updateQuestion]);

  const handleRemoveAnswer = useCallback((index: number) => {
    if (answers.length <= 2) return;
    const newAnswers = answers.filter((_, i) => i !== index);
    updateQuestion({ answers: newAnswers });
  }, [answers, updateQuestion]);

  const handleTimeLimitChange = useCallback((value: string) => {
    updateQuestion({ timeLimit: parseInt(value) });
  }, [updateQuestion]);

  const handleMultipleToggle = useCallback((checked: boolean) => {
    const newType = checked ? 'poll-multiple' : 'poll-single';
    const currentQuestion = {
      type: newType,
      text: question?.text || '',
      answers: question?.answers || [
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
      ],
      timeLimit: question?.timeLimit || 30,
    } as PollQuestion;
    onSlideChange({ ...slide, question: currentQuestion });
  }, [slide, question, onSlideChange]);

  // Initialize with default answers if empty
  if (!question) {
    updateQuestion({});
  }

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <div className="space-y-2">
        <Label htmlFor="question-text">Question</Label>
        <Input
          id="question-text"
          value={question?.text || ''}
          onChange={handleQuestionTextChange}
          placeholder="Enter your poll question"
          className="text-lg"
        />
      </div>

      {/* Poll Type Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="multiple-choice">Multiple Selection</Label>
          <p className="text-sm text-muted-foreground">
            Allow participants to select multiple options
          </p>
        </div>
        <Switch
          id="multiple-choice"
          checked={isMultiple}
          onCheckedChange={handleMultipleToggle}
        />
      </div>

      {/* Time Limit */}
      <div className="space-y-2">
        <Label>Time Limit</Label>
        <Select
          value={String(question?.timeLimit || 30)}
          onValueChange={handleTimeLimitChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_LIMITS.map((limit) => (
              <SelectItem key={limit} value={String(limit)}>
                {limit} seconds
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Answers */}
      <div className="space-y-2">
        <Label>Options</Label>
        <div className="space-y-2">
          {answers.map((answer, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
                  {String.fromCharCode(65 + index)}
                </div>
                <Input
                  value={answer.text}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
                {answers.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAnswer(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {answers.length < 6 && (
          <Button variant="outline" onClick={handleAddAnswer} className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}
      </div>
    </div>
  );
}
