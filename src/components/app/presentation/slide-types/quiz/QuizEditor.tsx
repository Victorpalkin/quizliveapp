'use client';

import { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check } from 'lucide-react';
import { SlideEditorProps } from '../types';
import { SingleChoiceQuestion, Answer } from '@/lib/types';
import { SlideImageUpload } from '../../editor/SlideImageUpload';

const TIME_LIMITS = [10, 20, 30, 60];

export function QuizEditor({ slide, presentation, onSlideChange }: SlideEditorProps) {
  const question = slide.question as SingleChoiceQuestion | undefined;
  const answers = question?.answers || [];
  const correctIndex = question?.correctAnswerIndex ?? 0;

  const updateQuestion = useCallback((updates: Partial<SingleChoiceQuestion>) => {
    const currentQuestion: SingleChoiceQuestion = {
      type: 'single-choice',
      text: question?.text || '',
      answers: question?.answers || [
        { text: '' },
        { text: '' },
        { text: '' },
        { text: '' },
      ],
      correctAnswerIndex: question?.correctAnswerIndex ?? 0,
      timeLimit: question?.timeLimit || 20,
      ...updates,
    };
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

  const handleCorrectAnswerChange = useCallback((index: number) => {
    updateQuestion({ correctAnswerIndex: index });
  }, [updateQuestion]);

  const handleAddAnswer = useCallback(() => {
    if (answers.length >= 6) return;
    updateQuestion({ answers: [...answers, { text: '' }] });
  }, [answers, updateQuestion]);

  const handleRemoveAnswer = useCallback((index: number) => {
    if (answers.length <= 2) return;
    const newAnswers = answers.filter((_, i) => i !== index);
    const newCorrectIndex = index < correctIndex ? correctIndex - 1 :
                           index === correctIndex ? 0 : correctIndex;
    updateQuestion({ answers: newAnswers, correctAnswerIndex: newCorrectIndex });
  }, [answers, correctIndex, updateQuestion]);

  const handleTimeLimitChange = useCallback((value: string) => {
    updateQuestion({ timeLimit: parseInt(value) });
  }, [updateQuestion]);

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
          placeholder="Enter your question"
          className="text-lg"
        />
      </div>

      {/* Image Upload */}
      <SlideImageUpload
        imageUrl={slide.imageUrl}
        presentationId={presentation.id}
        slideId={slide.id}
        promptContext={question?.text || 'quiz question'}
        suggestedPrompt={slide.imagePrompt}
        onImageChange={(url) => onSlideChange({ ...slide, imageUrl: url })}
      />

      {/* Time Limit */}
      <div className="space-y-2">
        <Label>Time Limit</Label>
        <Select
          value={String(question?.timeLimit || 20)}
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
        <Label>Answers</Label>
        <div className="space-y-2">
          {answers.map((answer, index) => (
            <Card key={index} className={correctIndex === index ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleCorrectAnswerChange(index)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    correctIndex === index
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-muted-foreground/30 hover:border-green-500'
                  }`}
                  title="Mark as correct answer"
                >
                  {correctIndex === index && <Check className="h-4 w-4" />}
                </button>
                <Input
                  value={answer.text}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder={`Answer ${index + 1}`}
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
            Add Answer
          </Button>
        )}
      </div>
    </div>
  );
}
