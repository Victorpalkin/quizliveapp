'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2 } from 'lucide-react';
import type { SlideElement } from '@/lib/types';

interface QuizPropertiesProps {
  element: SlideElement;
  onUpdate: (updates: Partial<SlideElement>) => void;
}

export function QuizProperties({ element, onUpdate }: QuizPropertiesProps) {
  const config = element.quizConfig;
  if (!config) return null;

  const updateConfig = (updates: Partial<typeof config>) => {
    onUpdate({ quizConfig: { ...config, ...updates } });
  };

  const updateAnswer = (index: number, text: string) => {
    const newAnswers = [...config.answers];
    newAnswers[index] = { text };
    updateConfig({ answers: newAnswers });
  };

  const addAnswer = () => {
    if (config.answers.length >= 6) return;
    updateConfig({ answers: [...config.answers, { text: `Option ${config.answers.length + 1}` }] });
  };

  const removeAnswer = (index: number) => {
    if (config.answers.length <= 2) return;
    const newAnswers = config.answers.filter((_, i) => i !== index);
    const newCorrect = config.correctAnswerIndex >= newAnswers.length
      ? 0
      : config.correctAnswerIndex > index
      ? config.correctAnswerIndex - 1
      : config.correctAnswerIndex;
    updateConfig({ answers: newAnswers, correctAnswerIndex: newCorrect });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label className="text-xs">Question</Label>
        <Input
          value={config.question}
          onChange={(e) => updateConfig({ question: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Answers</Label>
        <RadioGroup
          value={String(config.correctAnswerIndex)}
          onValueChange={(v) => updateConfig({ correctAnswerIndex: Number(v) })}
          className="mt-2 space-y-2"
        >
          {config.answers.map((answer, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem value={String(i)} id={`answer-${i}`} />
              <Input
                value={answer.text}
                onChange={(e) => updateAnswer(i, e.target.value)}
                className="flex-1 h-8"
                placeholder={`Answer ${i + 1}`}
              />
              {config.answers.length > 2 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAnswer(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
        {config.answers.length < 6 && (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={addAnswer}>
            <Plus className="h-3 w-3 mr-1" /> Add Answer
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">Select the correct answer</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Time Limit (s)</Label>
          <Input
            type="number"
            value={config.timeLimit}
            onChange={(e) => updateConfig({ timeLimit: Number(e.target.value) })}
            min={0}
            max={120}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Points</Label>
          <Input
            type="number"
            value={config.pointValue}
            onChange={(e) => updateConfig({ pointValue: Number(e.target.value) })}
            min={0}
            step={100}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
