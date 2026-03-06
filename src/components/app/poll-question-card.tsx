'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, MessageSquare, ListChecks, AlignLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type QuestionType = 'poll-single' | 'poll-multiple' | 'poll-free-text';

export interface QuestionFormData {
  id: string;
  type: QuestionType;
  text: string;
  answers: string[];
  placeholder?: string;
  maxLength?: number;
  showLiveResults?: boolean;
}

const QUESTION_ICONS: Record<QuestionType, React.ReactNode> = {
  'poll-single': <MessageSquare className="h-4 w-4" />,
  'poll-multiple': <ListChecks className="h-4 w-4" />,
  'poll-free-text': <AlignLeft className="h-4 w-4" />,
};

const QUESTION_TYPE_NAMES: Record<QuestionType, string> = {
  'poll-single': 'Single Choice',
  'poll-multiple': 'Multiple Choice',
  'poll-free-text': 'Free Text',
};

interface PollQuestionCardProps {
  question: QuestionFormData;
  index: number;
  questionsCount: number;
  onUpdate: (index: number, updates: Partial<QuestionFormData>) => void;
  onRemove: (index: number) => void;
  onUpdateAnswer: (questionIndex: number, answerIndex: number, value: string) => void;
  onAddAnswer: (questionIndex: number) => void;
  onRemoveAnswer: (questionIndex: number, answerIndex: number) => void;
}

export function PollQuestionCard({
  question,
  index,
  questionsCount,
  onUpdate,
  onRemove,
  onUpdateAnswer,
  onAddAnswer,
  onRemoveAnswer,
}: PollQuestionCardProps) {
  return (
    <div className="border rounded-xl p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Question {index + 1}</span>
          <div className="flex items-center gap-1 px-2 py-1 bg-background rounded-md text-xs">
            {QUESTION_ICONS[question.type]}
            <span>{QUESTION_TYPE_NAMES[question.type]}</span>
          </div>
        </div>
        {questionsCount > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
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
          onValueChange={(value: QuestionType) => onUpdate(index, {
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
          onChange={(e) => onUpdate(index, { text: e.target.value })}
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
                onChange={(e) => onUpdateAnswer(index, aIndex, e.target.value)}
                placeholder={`Option ${aIndex + 1}`}
                className="flex-1"
              />
              {question.answers.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveAnswer(index, aIndex)}
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
              onClick={() => onAddAnswer(index)}
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
              onChange={(e) => onUpdate(index, { placeholder: e.target.value })}
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
              onChange={(e) => onUpdate(index, { maxLength: parseInt(e.target.value) || 500 })}
              className="w-32"
            />
          </div>
        </div>
      )}
    </div>
  );
}
